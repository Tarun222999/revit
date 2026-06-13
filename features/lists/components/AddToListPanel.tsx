import { router } from 'expo-router';
import { Text, View } from 'react-native';

import { ErrorState } from '@/components/feedback/ErrorState';
import { LoadingState } from '@/components/feedback/LoadingState';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import {
  useAddMediaItemToList,
  useRemoveListItem,
} from '@/features/lists/hooks/useListMutations';
import { useMediaListMemberships } from '@/features/lists/hooks/useMediaListMemberships';
import { useUserLists } from '@/features/lists/hooks/useUserLists';
import type { MediaListMembership, UserListSummary } from '@/features/lists/types';

type AddToListPanelProps = {
  mediaItemId: string;
  onClose: () => void;
  userId: string;
};

function getErrorMessage(error: unknown, fallback: string) {
  return error instanceof Error ? error.message : fallback;
}

function getItemCountLabel(count: number) {
  return count === 1 ? '1 title' : `${count} titles`;
}

function getMembershipMap(memberships: MediaListMembership[]) {
  return new Map(memberships.map((membership) => [membership.listId, membership]));
}

function MembershipRow({
  isPending,
  list,
  membership,
  onToggle,
}: {
  isPending: boolean;
  list: UserListSummary;
  membership?: MediaListMembership;
  onToggle: () => void;
}) {
  const isSelected = Boolean(membership);

  return (
    <Card className="gap-3 p-3">
      <View className="flex-row items-center justify-between gap-3">
        <View className="min-w-0 flex-1 gap-1">
          <Text className="text-base font-bold text-archive-50" numberOfLines={1}>
            {list.name}
          </Text>
          <Text className="text-sm text-archive-300" numberOfLines={1}>
            {getItemCountLabel(list.itemCount)}
            {list.description ? ` - ${list.description}` : ''}
          </Text>
        </View>

        <View className="min-w-0">
          <Button
            className="min-h-10 px-4"
            loading={isPending}
            onPress={onToggle}
            title={isSelected ? 'Remove' : 'Add'}
            variant={isSelected ? 'secondary' : 'primary'}
          />
        </View>
      </View>

      {isSelected ? (
        <Text className="text-xs font-semibold text-gold-300">In this list</Text>
      ) : null}
    </Card>
  );
}

export function AddToListPanel({
  mediaItemId,
  onClose,
  userId,
}: AddToListPanelProps) {
  const listsQuery = useUserLists(userId);
  const membershipsQuery = useMediaListMemberships(userId, mediaItemId);
  const addMutation = useAddMediaItemToList();
  const removeMutation = useRemoveListItem();
  const lists = listsQuery.data ?? [];
  const memberships = membershipsQuery.data ?? [];
  const membershipMap = getMembershipMap(memberships);
  const mutationError = addMutation.error ?? removeMutation.error;
  const isLoading = listsQuery.isLoading || membershipsQuery.isLoading;
  const isError = listsQuery.isError || membershipsQuery.isError;

  const toggleListMembership = (list: UserListSummary) => {
    const membership = membershipMap.get(list.id);

    if (membership) {
      removeMutation.mutate({
        listItemId: membership.listItemId,
        mediaItemId,
        userId,
      });
      return;
    }

    addMutation.mutate({
      listId: list.id,
      mediaItemId,
      userId,
    });
  };

  return (
    <Card className="gap-4 border-gold-500/70">
      <View className="flex-row items-start justify-between gap-4">
        <View className="min-w-0 flex-1 gap-1">
          <Text className="text-xl font-bold text-archive-50">Add to List</Text>
          <Text className="text-sm leading-5 text-archive-300">
            Save this title to one or more mixed-media collections.
          </Text>
        </View>
        <Button
          className="min-h-10 px-4"
          onPress={onClose}
          title="Close"
          variant="secondary"
        />
      </View>

      {isLoading ? <LoadingState message="Loading lists" /> : null}

      {isError ? (
        <ErrorState
          title="Lists unavailable"
          message={getErrorMessage(
            listsQuery.error ?? membershipsQuery.error,
            'Unable to load your lists right now.',
          )}
          retryLabel="Reload lists"
          onRetry={() => {
            listsQuery.refetch();
            membershipsQuery.refetch();
          }}
        />
      ) : null}

      {!isLoading && !isError && lists.length === 0 ? (
        <View className="gap-3">
          <Text className="text-sm leading-5 text-archive-300">
            You do not have any lists yet. Create one from the Lists tab, then come back to save this title.
          </Text>
          <Button
            onPress={() => {
              onClose();
              router.push('/lists');
            }}
            title="Go to Lists"
            variant="secondary"
          />
        </View>
      ) : null}

      {!isLoading && !isError && lists.length > 0 ? (
        <View className="gap-3">
          {lists.map((list) => {
            const membership = membershipMap.get(list.id);
            const isPending =
              addMutation.isPending && addMutation.variables?.listId === list.id
                ? true
                : removeMutation.isPending &&
                  removeMutation.variables?.listItemId === membership?.listItemId;

            return (
              <MembershipRow
                isPending={isPending}
                key={list.id}
                list={list}
                membership={membership}
                onToggle={() => toggleListMembership(list)}
              />
            );
          })}
        </View>
      ) : null}

      {mutationError ? (
        <Text className="text-sm leading-5 text-reel-400">
          {getErrorMessage(mutationError, 'Unable to update list membership.')}
        </Text>
      ) : null}
    </Card>
  );
}
