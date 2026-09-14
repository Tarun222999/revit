import { assertJournalDate } from '@/features/journal/model/journalReadModels';
import type {
  DeleteJournalEventInput,
  JournalEventType,
  JournalLifecycleIntent,
  JournalMutationResult,
  LogJournalEventInput,
  RemoveJournalPlanInput,
  RemoveJournalTitleInput,
  SaveJournalPlanInput,
  UpdateJournalEventInput,
} from '@/features/journal/types';
import { supabase } from '@/lib/supabase/client';

const REQUEST_ID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const EVENT_TYPE_BY_INTENT: Record<JournalLifecycleIntent, JournalEventType> = {
  complete: 'completed',
  previous_watch: 'completed',
  resume: 'started',
  rewatch: 'completed',
  start: 'started',
  stop: 'stopped',
};

type PendingEventRequest = {
  fingerprint: string;
  promise: Promise<JournalMutationResult>;
};

const pendingEventRequests = new Map<string, PendingEventRequest>();

function requireObject(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new Error('Journal operation returned an invalid result.');
  }
  return value as Record<string, unknown>;
}

function requireString(value: unknown, field: string) {
  if (typeof value !== 'string' || value.length === 0) {
    throw new Error(`Journal operation result is missing ${field}.`);
  }
  return value;
}

function optionalInteger(value: unknown, field: string) {
  if (value == null) return undefined;
  if (!Number.isInteger(value) || (value as number) < 0) {
    throw new Error(`Journal operation result has an invalid ${field}.`);
  }
  return value as number;
}

export function toJournalMutationResult(value: unknown): JournalMutationResult {
  const result = requireObject(value);
  const affectedDates = result.affected_dates;

  if (!Array.isArray(affectedDates)) {
    throw new Error('Journal operation result is missing affected dates.');
  }

  if (typeof result.title_deleted !== 'boolean') {
    throw new Error('Journal operation result is missing title deletion state.');
  }

  if (typeof result.idempotent_replay !== 'boolean') {
    throw new Error('Journal operation result is missing replay state.');
  }

  return {
    affectedDates: [
      ...new Set(
        affectedDates.map((date) =>
          assertJournalDate(requireString(date, 'affected date')),
        ),
      ),
    ],
    completedCount: optionalInteger(result.completed_count, 'completed count'),
    eventCount: optionalInteger(result.event_count, 'event count'),
    eventId:
      result.event_id == null
        ? null
        : requireString(result.event_id, 'event ID'),
    hadActivePlan:
      typeof result.had_active_plan === 'boolean'
        ? result.had_active_plan
        : undefined,
    idempotentReplay: result.idempotent_replay,
    journalEntryId: requireString(result.journal_entry_id, 'Journal title ID'),
    mediaItemId: requireString(result.media_item_id, 'media item ID'),
    titleDeleted: result.title_deleted,
    userId: requireString(result.user_id, 'user ID'),
  };
}

function assertToday(today: string) {
  return assertJournalDate(today, 'Local today date');
}

function assertActivityDate(eventDate: string, today: string) {
  assertJournalDate(eventDate, 'Event date');
  assertToday(today);
  if (eventDate > today) {
    throw new Error('Journal activity cannot be dated in the future.');
  }
}

async function executeJournalEvent(
  input: LogJournalEventInput,
): Promise<JournalMutationResult> {
  const eventType = EVENT_TYPE_BY_INTENT[input.intent];
  assertActivityDate(input.eventDate, input.today);

  if (!REQUEST_ID_PATTERN.test(input.requestId)) {
    throw new Error('Journal request ID must be a UUID.');
  }

  if (input.intent === 'previous_watch' && input.source !== 'history') {
    throw new Error('A previous watch must be added from History.');
  }

  const gameMutation = input.mediaType === 'game';
  const playedOnPlatform = input.playedOnPlatform?.trim();
  if (eventType !== 'completed' && input.rating != null && !gameMutation) {
    throw new Error('Only a completed watch can have a rating.');
  }

  const resolveActivePlan =
    input.intent !== 'previous_watch' &&
    (input.source === 'planner' || input.source === 'planned_title');

  const args = {
    p_event_date: input.eventDate,
    p_event_type: eventType,
    p_media_item_id: input.mediaItemId,
    p_notes: input.notes,
    p_rating: input.rating,
    p_request_id: input.requestId,
    p_resolve_active_plan: resolveActivePlan,
    p_today: input.today,
    ...(gameMutation && playedOnPlatform ? { p_played_on_platform: playedOnPlatform } : {}),
  };
  const { data, error } = gameMutation
    ? await supabase.functions.invoke<unknown>('journal-game-lifecycle', {
      body: {
        eventDate: input.eventDate,
        eventType,
        mediaItemId: input.mediaItemId,
        notes: input.notes,
        operation: 'log',
        playedOnPlatform,
        rating: input.rating,
        requestId: input.requestId,
        resolveActivePlan,
        today: input.today,
      },
    })
    : await supabase.rpc('journal_log_event', args);

  if (error) throw error;
  return toJournalMutationResult(data);
}

/**
 * Coalesces an in-flight retry with the same request ID. The database unique
 * operation key remains the durable protection across restarts and devices.
 */
export function logJournalEvent(input: LogJournalEventInput) {
  const fingerprint = JSON.stringify(input);
  const pending = pendingEventRequests.get(input.requestId);

  if (pending) {
    if (pending.fingerprint !== fingerprint) {
      return Promise.reject(
        new Error('Journal request ID is already in use by another operation.'),
      );
    }
    return pending.promise;
  }

  const promise = executeJournalEvent(input).finally(() => {
    pendingEventRequests.delete(input.requestId);
  });
  pendingEventRequests.set(input.requestId, { fingerprint, promise });
  return promise;
}

export async function saveJournalPlan(input: SaveJournalPlanInput) {
  assertToday(input.today);
  if (input.plannedFor) {
    assertJournalDate(input.plannedFor, 'Planned date');
    if (input.plannedFor < input.today) {
      throw new Error('A new planned date cannot be in the past.');
    }
  }

  const { data, error } = input.mediaType === 'game'
    ? await supabase.functions.invoke<unknown>('journal-game-lifecycle', {
      body: {
        mediaItemId: input.mediaItemId,
        operation: 'plan',
        plannedFor: input.plannedFor,
        today: input.today,
      },
    })
    : await supabase.rpc('journal_save_plan', {
      p_media_item_id: input.mediaItemId,
      p_planned_for: input.plannedFor,
      p_today: input.today,
    });
  if (error) throw error;
  return toJournalMutationResult(data);
}

export async function removeJournalPlan(input: RemoveJournalPlanInput) {
  const { data, error } = await supabase.rpc('journal_remove_plan', {
    p_journal_entry_id: input.journalEntryId,
  });
  if (error) throw error;
  return toJournalMutationResult(data);
}

export async function updateJournalEvent(input: UpdateJournalEventInput) {
  assertActivityDate(input.eventDate, input.today);
  const gameMutation = input.mediaType === 'game';
  const playedOnPlatform = input.playedOnPlatform?.trim();
  const args = {
    p_event_date: input.eventDate,
    p_event_id: input.eventId,
    p_notes: input.notes,
    p_rating: input.rating,
    p_today: input.today,
    ...(gameMutation && playedOnPlatform ? { p_played_on_platform: playedOnPlatform } : {}),
  };
  const { data, error } = gameMutation
    ? await supabase.functions.invoke<unknown>('journal-game-lifecycle', {
      body: {
        eventDate: input.eventDate,
        eventId: input.eventId,
        notes: input.notes,
        operation: 'update',
        playedOnPlatform,
        rating: input.rating,
        today: input.today,
      },
    })
    : await supabase.rpc('journal_update_event', args);
  if (error) throw error;
  return toJournalMutationResult(data);
}

export async function deleteJournalEvent(input: DeleteJournalEventInput) {
  const { data, error } = input.mediaType === 'game'
    ? await supabase.functions.invoke<unknown>('journal-game-lifecycle', {
      body: {
        emptyTitleAction: input.emptyTitleAction ?? null,
        eventId: input.eventId,
        operation: 'delete',
      },
    })
    : await supabase.rpc('journal_delete_event', {
      p_empty_title_action: input.emptyTitleAction ?? null,
      p_event_id: input.eventId,
    });
  if (error) throw error;
  return toJournalMutationResult(data);
}

export async function removeJournalTitle(input: RemoveJournalTitleInput) {
  const { data, error } = await supabase.rpc('journal_remove_title', {
    p_journal_entry_id: input.journalEntryId,
  });
  if (error) throw error;
  return toJournalMutationResult(data);
}
