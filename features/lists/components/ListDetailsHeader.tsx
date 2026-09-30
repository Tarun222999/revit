import { Text, View } from 'react-native';
import { router } from 'expo-router';
import { Button } from '@/components/ui/Button';
import { CollectionArtwork } from './CollectionArtwork';
import { collectionTitleStyle } from './ListCard';
import type { UserListDetails } from '@/features/lists/types';

export function ListDetailsHeader({
  list,
  onEdit,
}: {
  list: UserListDetails;
  onEdit: () => void;
}) {
  return (
    <View className="gap-4 px-5 pt-4 pb-6">
      <View className="h-40">
        <CollectionArtwork
          items={list.items.map((item) => ({
            mediaItemId: item.mediaItemId,
            title: item.media.title,
            mediaType: item.media.mediaType,
            imageUrl: item.media.imageUrl,
          }))}
        />
      </View>
      <Text className="text-xs uppercase tracking-widest text-gold-300">
        Your collection · Only you
      </Text>
      <Text className="text-4xl text-archive-50" style={collectionTitleStyle}>
        {list.name}
      </Text>
      {list.description ? (
        <Text className="text-sm leading-6 text-archive-300">
          {list.description}
        </Text>
      ) : null}
      <Text className="text-sm text-archive-200">
        {list.itemCount} {list.itemCount === 1 ? 'title' : 'titles'}
      </Text>
      <View className="flex-row flex-wrap gap-3">
        <Button title="Add titles" onPress={() => router.push('/search')} />
        <Button title="Edit list" variant="secondary" onPress={onEdit} />
      </View>
      <Text className="text-xs leading-5 text-archive-300">
        Opens Search · Add to List from a title’s details.
      </Text>
    </View>
  );
}
