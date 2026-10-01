import { useCallback, useEffect } from 'react';
import { FlatList, Pressable, Text, View } from 'react-native';
import { Image } from 'expo-image';
import { router, Stack, useFocusEffect } from 'expo-router';
import { useInfiniteQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/Button';
import { Screen } from '@/components/ui/Screen';
import { ErrorState } from '@/components/feedback/ErrorState';
import { LoadingState } from '@/components/feedback/LoadingState';
import { EmptyState } from '@/components/feedback/EmptyState';
import { CollectionArtwork } from '@/features/lists/components/CollectionArtwork';
import { useAuth } from '@/features/auth/hooks/useAuth';
import { storePendingAuthReturnTo } from '@/features/auth/utils/pendingDestination';
import {
  createListShareUrl,
  parseListShareKey,
} from '@/features/sharing/model/listShare';
import { createTitleShareId } from '@/features/sharing/model/titleShare';
import {
  getSharedList,
  SharedListUnavailableError,
} from '@/features/sharing/api/list-sharing-api';
import { useOnlineStatus } from '@/lib/query/network';

export function SharedListScreen({ shareKey }: { shareKey?: string }) {
  const { user, loading } = useAuth();
  const online = useOnlineStatus();
  let valid = false;
  try {
    parseListShareKey(shareKey ?? '');
    valid = true;
  } catch {
    /* Unavailable below. */
  }
  const query = useInfiniteQuery({
    queryKey: ['shared-list', shareKey, user?.id ?? 'anonymous'],
    queryFn: ({ pageParam }) => getSharedList(shareKey!, pageParam),
    initialPageParam: null as string | null,
    getNextPageParam: (page) => page.nextCursor ?? undefined,
    enabled: valid && !loading,
    staleTime: 0,
    gcTime: 0,
    retry: false,
    networkMode: 'always',
  });
  const refetch = query.refetch;
  useFocusEffect(
    useCallback(() => {
      if (valid && !loading) void refetch();
    }, [valid, loading, refetch]),
  );
  const unavailable =
    !valid || query.error instanceof SharedListUnavailableError;
  const header = unavailable ? undefined : query.data?.pages[0];
  useEffect(() => {
    if (header?.isOwner && user && !query.isFetching && !query.isError) {
      router.replace({
        pathname: '/lists/[id]',
        params: { id: header.listId },
      });
    }
  }, [header, user, query.isFetching, query.isError]);
  // Live list changes between pages can shift offsets. Never show duplicate titles.
  const items = header
    ? Array.from(
        new Map(
          query
            .data!.pages.flatMap((page) => page.items)
            .map((item) => [createTitleShareId(item), item]),
        ).values(),
      )
    : [];
  const signIn = async () => {
    const returnTo = createListShareUrl(shareKey!);
    await storePendingAuthReturnTo(returnTo).catch(() => undefined);
    router.push({ pathname: '/welcome', params: { returnTo } });
  };
  return (
    <Screen padded={false}>
      <Stack.Screen options={{ title: 'Shared list' }} />
      {unavailable ? (
        <View className="p-5">
          <EmptyState
            title="Shared list unavailable"
            message="This list link is unavailable. It may have been removed or stopped sharing."
          />
        </View>
      ) : loading || query.isPending ? (
        <LoadingState message="Loading shared list" />
      ) : !header ? (
        <View className="p-5">
          <ErrorState
            title={online ? 'Unable to load shared list' : "You're offline"}
            message="Check your connection and try again."
            onRetry={() => void refetch()}
          />
        </View>
      ) : header.isOwner ? (
        <LoadingState message="Opening your list" />
      ) : (
        <FlatList
          data={items}
          keyExtractor={(item, index) =>
            `${item.source}:${item.sourceId}:${index}`
          }
          contentContainerStyle={{ padding: 20, paddingBottom: 40, gap: 14 }}
          refreshing={query.isRefetching}
          onRefresh={() => void refetch()}
          ListHeaderComponent={
            <View className="gap-4 pb-4">
              <View className="h-40">
                <CollectionArtwork
                  items={header.coverItems.map((item) => ({
                    ...item,
                    mediaItemId: createTitleShareId(item),
                  }))}
                />
              </View>
              <Text className="text-xs uppercase tracking-widest text-gold-300">
                Shared list · Read only
              </Text>
              <Text
                accessibilityRole="header"
                className="text-3xl font-bold text-archive-50"
              >
                {header.name}
              </Text>
              {header.description ? (
                <Text className="text-base leading-6 text-archive-200">
                  {header.description}
                </Text>
              ) : null}
              <Text className="text-sm text-archive-300">
                {header.itemCount} {header.itemCount === 1 ? 'title' : 'titles'}
              </Text>
              {!user ? (
                <Button
                  title="Sign in to save titles"
                  variant="secondary"
                  onPress={() => void signIn()}
                />
              ) : null}
              {query.isRefetchError ? (
                <ErrorState
                  message="Unable to refresh. Check your connection and try again."
                  onRetry={() => void refetch()}
                />
              ) : null}
            </View>
          }
          ListEmptyComponent={
            <EmptyState
              title="No titles added yet"
              message="Titles added to this list will appear here."
            />
          }
          renderItem={({ item }) => (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`Open ${item.title}, ${item.mediaType}`}
              className="min-h-24 flex-row items-center gap-4 rounded-app border border-archive-600 bg-archive-800 p-3"
              onPress={() =>
                router.push(
                  `/title/${encodeURIComponent(createTitleShareId(item))}`,
                )
              }
            >
              {item.imageUrl ? (
                <Image
                  source={{ uri: item.imageUrl }}
                  style={{ width: 52, height: 78, borderRadius: 8 }}
                  contentFit="cover"
                />
              ) : (
                <View className="h-20 w-14 rounded-lg bg-shelf-700" />
              )}
              <View className="min-w-0 flex-1 gap-2">
                <Text className="text-lg font-semibold text-archive-50">
                  {item.title}
                </Text>
                <Text className="text-sm capitalize text-archive-300">
                  {[item.year, item.mediaType].filter(Boolean).join(' · ')}
                </Text>
              </View>
            </Pressable>
          )}
          ListFooterComponent={
            <View className="gap-4 pt-4">
              {query.isFetchNextPageError ? (
                <ErrorState
                  message="Unable to load more titles. Try again."
                  onRetry={() => void query.fetchNextPage()}
                />
              ) : null}
              {query.hasNextPage ? (
                <Button
                  title="Load more titles"
                  variant="secondary"
                  loading={query.isFetchingNextPage}
                  disabled={query.isRefetching}
                  onPress={() => void query.fetchNextPage()}
                />
              ) : null}
            </View>
          }
        />
      )}
    </Screen>
  );
}
