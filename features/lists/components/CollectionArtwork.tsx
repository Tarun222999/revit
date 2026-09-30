import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { useEffect, useState } from 'react';
import { Text, View } from 'react-native';
import type { ListCoverMedia } from '@/features/lists/types';

function Cover({ item }: { item: ListCoverMedia }) {
  const [failed, setFailed] = useState(false);
  useEffect(() => setFailed(false), [item.imageUrl]);
  return item.imageUrl && !failed ? (
    <Image
      source={{ uri: item.imageUrl }}
      onError={() => setFailed(true)}
      contentFit="cover"
      style={{ width: '100%', height: '100%' }}
    />
  ) : (
    <View className="flex-1 items-center justify-center bg-shelf-700 px-2">
      <Text
        className="text-center text-sm font-semibold text-archive-200"
        numberOfLines={3}
      >
        {item.title}
      </Text>
    </View>
  );
}

export function CollectionArtwork({
  items,
  stacked = false,
}: {
  items: ListCoverMedia[];
  stacked?: boolean;
}) {
  const covers = items.slice(0, 3);
  return (
    <View
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      className="flex-1 overflow-hidden rounded-xl bg-archive-800"
    >
      {covers.length === 0 ? (
        <View className="flex-1 items-center justify-center border border-dashed border-archive-600 rounded-xl">
          <Ionicons name="albums-outline" size={32} color="#e8c77d" />
        </View>
      ) : stacked ? (
        covers.map((item, index) => (
          <View
            key={item.mediaItemId}
            style={{
              position: 'absolute',
              width: '48%',
              height: 124,
              left: `${8 + index * 23}%`,
              bottom: -8 + index * 3,
              transform: [{ rotate: `${[-9, 4, 14][index]}deg` }],
            }}
            className="overflow-hidden rounded-md border border-archive-500"
          >
            <Cover item={item} />
          </View>
        ))
      ) : (
        <View className="flex-1 flex-row gap-1">
          {covers.map((item) => (
            <View key={item.mediaItemId} className="flex-1">
              <Cover item={item} />
            </View>
          ))}
        </View>
      )}
    </View>
  );
}
