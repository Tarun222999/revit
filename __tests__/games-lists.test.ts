import { createMediaRouteId } from '@/features/media/api/media-api';
import {
  addMediaItemToList,
  removeListItem,
  updateListItemNote,
} from '@/features/lists/api/list-api';
import {
  toUserListDetails,
  toUserListSummary,
} from '@/features/lists/model/listModels';
import { getMediaDetails } from '@/features/media/api/media-api';
import { supabase } from '@/lib/supabase/client';

jest.mock('@/features/media/api/media-api', () => ({
  createMediaRouteId: jest.requireActual('@/features/media/api/media-api')
    .createMediaRouteId,
  getMediaDetails: jest.fn(),
}));

jest.mock('@/lib/supabase/client', () => ({
  supabase: {
    from: jest.fn(),
  },
}));

const mockGetMediaDetails = jest.mocked(getMediaDetails);
const mockFrom = jest.mocked(supabase.from);

function gameRow(overrides: Record<string, unknown> = {}) {
  return {
    id: 'media-game',
    source: 'igdb',
    source_id: '42',
    media_type: 'game',
    title: 'Tidebound',
    original_title: null,
    description: null,
    release_date: '2024-01-20',
    image_url: null,
    backdrop_url: null,
    genres: ['Adventure'],
    metadata: {},
    created_at: '2026-08-20T10:00:00.000Z',
    updated_at: '2026-08-20T10:00:00.000Z',
    ...overrides,
  };
}

function listRow(items: unknown[]) {
  return {
    id: 'list-1',
    user_id: 'user-1',
    name: 'Favorites',
    description: null,
    is_default: false,
    created_at: '2026-08-20T10:00:00.000Z',
    updated_at: '2026-08-20T10:00:00.000Z',
    list_items: items,
  };
}

function listItem(overrides: Record<string, unknown> = {}) {
  return {
    id: 'list-item-1',
    list_id: 'list-1',
    media_item_id: 'media-game',
    position: 1,
    note: 'Play this next.',
    created_at: '2026-08-21T10:00:00.000Z',
    media_items: gameRow(),
    ...overrides,
  };
}

beforeEach(() => {
  jest.clearAllMocks();
});

describe('Games in mixed-media Lists', () => {
  it('keeps game covers, labels, counts, order, and list notes in the shared models', () => {
    const summary = toUserListSummary(
      listRow([
        listItem({ position: 2 }),
        listItem({
          id: 'list-item-2',
          media_item_id: 'media-movie',
          position: 1,
          media_items: gameRow({
            id: 'media-movie',
            source: 'tmdb',
            source_id: 'movie:7',
            media_type: 'movie',
            title: 'A movie',
            image_url: 'https://image.test/movie.jpg',
          }),
        }),
      ]) as never,
    );

    expect(summary.itemCount).toBe(2);
    expect(summary.mediaTypeCounts).toMatchObject({ game: 1, movie: 1 });
    expect(summary.coverItems.map((item) => item.mediaType)).toEqual([
      'movie',
      'game',
    ]);
    expect(summary.coverItems[1]).toMatchObject({
      imageUrl: null,
      mediaType: 'game',
      title: 'Tidebound',
    });

    const details = toUserListDetails(listRow([listItem()]) as never);
    expect(details.items[0]).toMatchObject({
      media: { mediaType: 'game', source: 'igdb', sourceId: '42' },
      note: 'Play this next.',
      position: 1,
    });
  });

  it('uses provider-aware routing for persisted games even when ids overlap', () => {
    expect(
      createMediaRouteId({ id: 'shared-id', source: 'igdb', sourceId: '42' }),
    ).toBe('igdb:42');
    expect(
      createMediaRouteId({ id: 'media-movie', source: 'tmdb', sourceId: 'movie:42' }),
    ).toBe('media-movie');
  });

  it('ensures the normalized IGDB row before adding and uses an idempotent conflict key', async () => {
    mockGetMediaDetails.mockResolvedValue({
      item: { ...gameRow(), id: 'normalized-game' } as never,
    });
    const single = jest.fn().mockResolvedValue({
      data: { id: 'list-item-1', list_id: 'list-1', media_item_id: 'normalized-game' },
      error: null,
    });
    const select = jest.fn(() => ({ single }));
    const upsert = jest.fn(() => ({ select }));
    mockFrom.mockReturnValue({ upsert } as never);

    await addMediaItemToList({
      listId: 'list-1',
      mediaItemId: 'stale-id',
      mediaSource: 'igdb',
      mediaSourceId: '42',
      userId: 'user-1',
    });

    expect(mockGetMediaDetails).toHaveBeenCalledWith({
      source: 'igdb',
      sourceId: '42',
    });
    expect(upsert).toHaveBeenCalledWith(
      { list_id: 'list-1', media_item_id: 'normalized-game' },
      { onConflict: 'list_id,media_item_id' },
    );
  });

  it('fails closed when a game add is missing its provider identity', async () => {
    await expect(
      addMediaItemToList({
        listId: 'list-1',
        mediaItemId: 'stale-id',
        mediaSource: 'igdb',
        userId: 'user-1',
      }),
    ).rejects.toThrow('Unable to save this game to a list right now.');
    expect(mockGetMediaDetails).not.toHaveBeenCalled();
    expect(mockFrom).not.toHaveBeenCalled();
  });

  it('normalizes notes and keeps remove/update mutations scoped to their item', async () => {
    const removeSingle = jest.fn().mockResolvedValue({
      data: { id: 'list-item-1', list_id: 'list-1', media_item_id: 'media-game' },
      error: null,
    });
    const removeSelect = jest.fn(() => ({ single: removeSingle }));
    const removeEq = jest.fn(() => ({ select: removeSelect }));
    const remove = jest.fn(() => ({ eq: removeEq }));

    const noteSingle = jest.fn().mockResolvedValue({
      data: { id: 'list-item-1', list_id: 'list-1', media_item_id: 'media-game', note: null },
      error: null,
    });
    const noteSelect = jest.fn(() => ({ single: noteSingle }));
    const noteEq = jest.fn(() => ({ select: noteSelect }));
    const update = jest.fn(() => ({ eq: noteEq }));
    mockFrom.mockReturnValueOnce({ delete: remove } as never).mockReturnValueOnce({ update } as never);

    await removeListItem({ listItemId: 'list-item-1', userId: 'user-1' });
    await updateListItemNote({ listItemId: 'list-item-1', note: '  ', userId: 'user-1' });

    expect(removeEq).toHaveBeenCalledWith('id', 'list-item-1');
    expect(update).toHaveBeenCalledWith({ note: null });
    expect(noteEq).toHaveBeenCalledWith('id', 'list-item-1');
  });
});
