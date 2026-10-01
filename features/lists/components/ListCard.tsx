import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { Platform, Pressable, Text, View } from 'react-native';
import { CollectionArtwork } from '@/features/lists/components/CollectionArtwork';
import type { UserListSummary } from '@/features/lists/types';

export const collectionTitleStyle = {
  fontFamily: Platform.OS === 'ios' ? 'Georgia' : 'serif',
};

export function ListCard({
  list,
  onPress,
  featured = false,
}: {
  list: UserListSummary;
  onPress: () => void;
  featured?: boolean;
}) {
  const count = `${list.itemCount} ${list.itemCount === 1 ? 'title' : 'titles'}`;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${list.name}, ${count}`}
      onPress={onPress}
      className="gap-3"
    >
      {featured ? (
        <View className="min-h-64 overflow-hidden rounded-xl border border-archive-600">
          <View className="absolute inset-0">
            <CollectionArtwork items={list.coverItems} />
          </View>
          <LinearGradient
            colors={['transparent', '#0d0b09eb', '#0d0b09']}
            style={{ position: 'absolute', inset: 0 }}
          />
          <View className="mt-28 flex-row items-end gap-3 p-5">
            <View className="min-w-0 flex-1 gap-2">
              <Text className="text-xs uppercase tracking-widest text-gold-300">
                Recently updated
              </Text>
              <Text
                className="text-3xl text-archive-50"
                style={collectionTitleStyle}
              >
                {list.name}
              </Text>
              <Text className="text-sm text-archive-200">
                {count} · A collection by you
              </Text>
            </View>
            <Ionicons name="arrow-forward" size={22} color="#e8c77d" />
          </View>
        </View>
      ) : (
        <>
          <View className="h-36">
            <CollectionArtwork items={list.coverItems} stacked />
          </View>
          <Text className="text-base font-semibold text-archive-50">
            {list.name}
          </Text>
          <Text className="text-sm text-archive-300">{count}</Text>
        </>
      )}
    </Pressable>
  );
}
