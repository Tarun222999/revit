import { useState } from 'react';
import { Pressable, Text, View, type LayoutChangeEvent } from 'react-native';

import { Button } from '@/components/ui/Button';
import { RATING_MAX, RATING_MIN, RATING_STEP } from '@/constants/ratings';

type RatingInputProps = {
  value: number | null;
  onChange: (value: number | null) => void;
};

function clampRating(value: number) {
  return Math.min(RATING_MAX, Math.max(RATING_MIN, value));
}

function roundToStep(value: number) {
  return clampRating(Math.round(value / RATING_STEP) * RATING_STEP);
}

export function RatingInput({ value, onChange }: RatingInputProps) {
  const [trackWidth, setTrackWidth] = useState(0);
  const percentage = value ? (value / RATING_MAX) * 100 : 0;

  const handleLayout = (event: LayoutChangeEvent) => {
    setTrackWidth(event.nativeEvent.layout.width);
  };

  const handlePress = (locationX: number) => {
    if (trackWidth <= 0) {
      return;
    }

    onChange(roundToStep((locationX / trackWidth) * RATING_MAX));
  };

  return (
    <View className="gap-2">
      <View className="flex-row items-center justify-between gap-3">
        <Text className="text-sm font-semibold text-archive-100">Rating</Text>
        <Text className="text-sm font-semibold text-archive-300">
          {value ? `${value} / ${RATING_MAX}` : 'Not rated'}
        </Text>
      </View>

      <Pressable
        accessibilityRole="adjustable"
        className="rounded-app border border-archive-700 bg-archive-800 p-4"
        onPress={(event) => handlePress(event.nativeEvent.locationX)}>
        <View
          className="h-2 overflow-hidden rounded-full bg-archive-700"
          onLayout={handleLayout}>
          <View
            className="h-full rounded-full bg-gold-400"
            style={{ width: `${percentage}%` }}
          />
        </View>
        <View className="mt-3 flex-row justify-between">
          <Text className="text-xs font-semibold text-archive-300">
            {RATING_MIN}
          </Text>
          <Text className="text-xs font-semibold text-archive-300">
            {RATING_MAX}
          </Text>
        </View>
      </Pressable>

      {value ? (
        <Button title="Clear rating" variant="ghost" onPress={() => onChange(null)} />
      ) : null}
    </View>
  );
}
