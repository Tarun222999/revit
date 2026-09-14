import { searchTitles } from '@/features/discovery/api/search-api';
import { supabase } from '@/lib/supabase/client';

jest.mock('@/lib/supabase/client', () => ({
  supabase: {
    functions: {
      invoke: jest.fn(),
    },
  },
}));

const mockInvoke = jest.mocked(supabase.functions.invoke);

describe('searchTitles', () => {
  beforeEach(() => {
    mockInvoke.mockReset();
  });

  it('sends the Games filter through the existing single media-search invocation', async () => {
    const signal = new AbortController().signal;
    mockInvoke.mockResolvedValue({
      data: { page: 1, results: [], totalPages: 1 },
      error: null,
    } as never);

    await expect(
      searchTitles({ query: 'zelda', mediaType: 'game', page: 1, signal }),
    ).resolves.toEqual({ page: 1, results: [], totalPages: 1 });

    expect(mockInvoke).toHaveBeenCalledWith('media-search', {
      body: { query: 'zelda', mediaType: 'game', page: 1 },
      signal,
    });
  });
});
