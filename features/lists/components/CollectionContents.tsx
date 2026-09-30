import { useState, type ReactNode } from 'react';
import { FlatList, Pressable, Text, View } from 'react-native';
import { EmptyState } from '@/components/feedback/EmptyState';
import { Button } from '@/components/ui/Button';
import { router } from 'expo-router';
import { MEDIA_TYPES, MEDIA_TYPE_LABELS } from '@/constants/media';
import {
  collectionMediaCounts,
  LIST_SORT_LABELS,
  visibleListItems,
  type ListMediaFilter,
  type ListSort,
} from '@/features/lists/model/listPresentation';
import type { UserListDetails, UserListItem } from '@/features/lists/types';
import { CollectionSheet } from './CollectionSheet';
import { ListItemCard } from './ListItemCard';
import { collectionTitleStyle } from './ListCard';

export function CollectionContents({
  header,
  list,
  itemErrorId,
  itemErrorMessage,
  removingItemId,
  savingNoteItemId,
  onRemoveItem,
  onSaveNote,
  onPressItem,
}: {
  header: ReactNode;
  list: UserListDetails;
  itemErrorId: string | null;
  itemErrorMessage: string | null;
  removingItemId: string | null;
  savingNoteItemId: string | null;
  onRemoveItem: (item: UserListItem) => void;
  onSaveNote: (item: UserListItem, note: string | null) => Promise<void>;
  onPressItem: (item: UserListItem) => void;
}) {
  const [filter, setFilter] = useState<ListMediaFilter>('all');
  const [sort, setSort] = useState<ListSort>('added');
  const [sorting, setSorting] = useState(false);
  const counts = collectionMediaCounts(list.items);
  const items = visibleListItems(list.items, filter, sort);
  return (
    <>
      <FlatList
        data={items}
        keyExtractor={(item) => item.id}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{ paddingBottom: 64 }}
        ListHeaderComponent={
          <>
            {header}
            <View className="gap-3 px-5">
              <View className="flex-row flex-wrap items-center justify-between gap-2 border-t border-archive-700 pt-4">
                <Text
                  className="text-xl text-archive-50"
                  style={collectionTitleStyle}
                >
                  In this collection
                </Text>
                {list.items.length ? (
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={`Sort titles: ${LIST_SORT_LABELS[sort]}`}
                    accessibilityState={{ expanded: sorting }}
                    className="min-h-12 justify-center"
                    onPress={() => setSorting(true)}
                  >
                    <Text className="text-sm text-gold-300">
                      {LIST_SORT_LABELS[sort]} ↓
                    </Text>
                  </Pressable>
                ) : null}
              </View>
              {list.items.length ? (
                <View className="flex-row flex-wrap gap-2">
                  {(
                    [
                      'all',
                      ...MEDIA_TYPES.filter((type) => counts[type] > 0),
                    ] as ListMediaFilter[]
                  ).map((type) => (
                    <Pressable
                      key={type}
                      accessibilityRole="button"
                      accessibilityLabel={`${type === 'all' ? 'All' : MEDIA_TYPE_LABELS[type]}, ${type === 'all' ? list.itemCount : counts[type]} titles`}
                      accessibilityState={{ selected: filter === type }}
                      onPress={() => setFilter(type)}
                      className={`min-h-12 justify-center rounded-app border px-3 ${filter === type ? 'border-gold-400 bg-archive-700' : 'border-archive-700'}`}
                    >
                      <Text
                        className={
                          filter === type
                            ? 'text-sm text-gold-300'
                            : 'text-sm text-archive-300'
                        }
                      >
                        {type === 'all' ? 'All' : MEDIA_TYPE_LABELS[type]} ·{' '}
                        {type === 'all' ? list.itemCount : counts[type]}
                      </Text>
                    </Pressable>
                  ))}
                </View>
              ) : null}
            </View>
          </>
        }
        ListEmptyComponent={
          <View className="p-5">
            <EmptyState
              title={
                list.items.length
                  ? 'No matching titles'
                  : 'Every collection starts somewhere.'
              }
              message={
                list.items.length
                  ? 'Choose another media type to see more.'
                  : 'Find a title in Search, open its details, then choose Add to List.'
              }
              actionLabel={
                list.items.length ? 'Show all titles' : 'Find a title'
              }
              onAction={() =>
                list.items.length ? setFilter('all') : router.push('/search')
              }
            />
          </View>
        }
        renderItem={({ item }) => (
          <View className="px-5">
            <ListItemCard
              item={item}
              isRemoving={removingItemId === item.id}
              isSavingNote={savingNoteItemId === item.id}
              mutationError={itemErrorId === item.id ? itemErrorMessage : null}
              onPress={() => onPressItem(item)}
              onRemove={() => onRemoveItem(item)}
              onSaveNote={(note) => onSaveNote(item, note)}
            />
          </View>
        )}
      />
      {sorting ? (
        <CollectionSheet title="Sort titles" onClose={() => setSorting(false)}>
          {(Object.keys(LIST_SORT_LABELS) as ListSort[]).map((value) => (
            <Button
              key={value}
              title={`${sort === value ? '✓ ' : ''}${LIST_SORT_LABELS[value]}`}
              accessibilityState={{ selected: sort === value }}
              variant="secondary"
              onPress={() => {
                setSort(value);
                setSorting(false);
              }}
            />
          ))}
        </CollectionSheet>
      ) : null}
    </>
  );
}
