import type { JournalStatus } from '@/constants/journal';
import type { MediaType } from '@/constants/media';
import type {
  Tables,
  TablesInsert,
  TablesUpdate,
} from '@/lib/supabase/types';
import type { MediaSource } from '@/types/media';

export type JournalEntryRow = Tables<'journal_entries'>;
export type JournalEntryInsert = TablesInsert<'journal_entries'>;
export type JournalEntryUpdate = TablesUpdate<'journal_entries'>;
export type JournalEventRow = Tables<'journal_events'>;
export type JournalEventInsert = TablesInsert<'journal_events'>;
export type JournalEventUpdate = TablesUpdate<'journal_events'>;
export type MediaItemRow = Tables<'media_items'>;

export type JournalEntry = Omit<JournalEntryRow, 'status'> & {
  status: JournalStatus;
};

export const JOURNAL_EVENT_TYPES = ['started', 'completed', 'stopped'] as const;

export type JournalEventType = (typeof JOURNAL_EVENT_TYPES)[number];

export type JournalPlan = {
  plannedFor: string | null;
};

export type JournalTitleState = {
  id: string;
  mediaItemId: string;
  status: JournalStatus;
  activePlan: JournalPlan | null;
};

export type JournalEvent = {
  id: string;
  journalEntryId: string;
  type: JournalEventType;
  eventDate: string;
  rating: number | null;
  notes: string | null;
};

export type JournalMediaSummary = {
  id: string;
  source: MediaSource;
  sourceId: string;
  mediaType: MediaType;
  title: string;
  originalTitle: string | null;
  releaseDate: string | null;
  year: string | null;
  imageUrl: string | null;
};

export type JournalTitleSummary = {
  titleState: JournalTitleState;
  latestCompletedEvent: JournalEvent | null;
  completedWatchCount: number;
};

export type JournalEventCursor = {
  eventDate: string;
  createdAt: string;
  id: string;
};

export type JournalHistoryPage = {
  events: JournalEvent[];
  nextCursor: JournalEventCursor | null;
};

export type JournalTimelineItem = {
  event: JournalEvent;
  media: JournalMediaSummary;
  currentStatus: JournalStatus;
};

export type JournalTimelinePage = {
  items: JournalTimelineItem[];
  nextCursor: JournalEventCursor | null;
};

export type JournalPlannerSection = 'today' | 'upcoming' | 'missed' | 'someday';

export type JournalPlannerItem = {
  titleState: JournalTitleState;
  media: JournalMediaSummary;
  section: JournalPlannerSection;
};

export type JournalCalendarEventItem = {
  event: JournalEvent;
  media: JournalMediaSummary;
};

export type JournalCalendarPlanItem = {
  journalEntryId: string;
  plannedFor: string;
  media: JournalMediaSummary;
};

export type JournalCalendarRange = {
  startDate: string;
  endDate: string;
};

export type JournalCalendarData = JournalCalendarRange & {
  events: JournalCalendarEventItem[];
  plans: JournalCalendarPlanItem[];
};

export type JournalEntryFormValues = {
  status: JournalStatus;
  rating: number | null;
  reviewHeadline: string;
  reviewBody: string;
  containsSpoilers: boolean;
  startedOn: string | null;
  completedOn: string | null;
};

export type CreateJournalEntryInput = JournalEntryFormValues & {
  mediaItemId: string;
  userId: string;
};

export type UpdateJournalEntryInput = JournalEntryFormValues & {
  entryId: string;
};

export type DeleteJournalEntryInput = {
  entryId: string;
};

export type JournalEntryForMediaQuery = {
  mediaItemId: string;
  userId: string;
};

export type JournalListEntryRow = JournalEntryRow & {
  media_items: MediaItemRow | null;
};

export type JournalListEntry = {
  id: string;
  mediaItemId: string;
  source: MediaSource;
  sourceId: string;
  mediaType: MediaType;
  title: string;
  originalTitle: string | null;
  description: string | null;
  releaseDate: string | null;
  year: string | null;
  imageUrl: string | null;
  backdropUrl: string | null;
  genres: string[];
  metadata: Record<string, unknown>;
  status: JournalStatus;
  rating: number | null;
  reviewHeadline: string | null;
  reviewBody: string | null;
  containsSpoilers: boolean;
  completedOn: string | null;
  startedOn: string | null;
  createdAt: string;
  updatedAt: string;
  lastActivityAt: string;
};

export type JournalMediaFilter = 'all' | MediaType;
export type JournalStatusFilter = JournalStatus[];
export type JournalRatingFilter = 'any' | 'rated' | 'unrated' | 'gte_4' | 'gte_3';
export type JournalDateFilter = 'all' | 'this_month' | 'last_30_days' | 'this_year';
export type JournalSort = 'recent_activity' | 'recently_added' | 'rating' | 'title';

export type JournalListFilters = {
  mediaType: JournalMediaFilter;
  statuses: JournalStatusFilter;
  rating: JournalRatingFilter;
  date: JournalDateFilter;
};

export type JournalTimelineGroup = {
  key: string;
  title: string;
  entries: JournalListEntry[];
};

export type JournalCalendarActivityLevel = 0 | 1 | 2 | 3;

export type JournalCalendarDay = {
  date: string;
  isCurrentMonth: boolean;
  entries: JournalListEntry[];
  entryCount: number;
  mediaTypes: MediaType[];
  activityLevel: JournalCalendarActivityLevel;
};

export type JournalCalendarMonth = {
  monthDate: string;
  days: JournalCalendarDay[];
  totalEntries: number;
  activeDayCount: number;
  bestDay: string | null;
  averageRating: number | null;
  maxEntriesInDay: number;
};
