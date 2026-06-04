import { useState } from 'react';
import {
  Pressable,
  Text,
  View,
  type GestureResponderEvent,
  type LayoutChangeEvent,
} from 'react-native';
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
  const ratingLabel = value ? `${value.toFixed(1)} / ${RATING_MAX}` : 'Not rated';

  const handleLayout = (event: LayoutChangeEvent) => {
    setTrackWidth(event.nativeEvent.layout.width);
  };

  const updateRatingFromGesture = (locationX: number) => {
    if (trackWidth <= 0) {
      return;
    }

    onChange(roundToStep((locationX / trackWidth) * RATING_MAX));
  };

  const handleRatingGesture = (event: GestureResponderEvent) => {
    updateRatingFromGesture(event.nativeEvent.locationX);
  };

  return (
    <View className="gap-3">
      <View className="flex-row items-center justify-between gap-3">
        <View className="min-w-0 flex-1 gap-1">
          <Text className="text-sm font-semibold text-archive-100">Rating</Text>
          <Text className="text-xs leading-4 text-archive-300">
            Optional personal score.
          </Text>
        </View>
        <Text className="text-sm font-bold text-gold-300">
          {ratingLabel}
        </Text>
      </View>

      <Pressable
        accessibilityHint="Tap or drag to choose a rating from 0.5 to 5."
        accessibilityLabel={`Rating, ${ratingLabel}`}
        accessibilityRole="adjustable"
        className="rounded-app border border-archive-700 bg-archive-800 p-4"
        onMoveShouldSetResponder={() => true}
        onPress={handleRatingGesture}
        onResponderGrant={handleRatingGesture}
        onResponderMove={handleRatingGesture}
      >
        <View
          className="relative h-7 justify-center"
          onLayout={handleLayout}
        >
          <View className="h-2 overflow-hidden rounded-full bg-archive-700">
            <View
              className="h-full rounded-full bg-gold-400"
              style={{ width: `${percentage}%` }}
            />
          </View>
          {value ? (
            <View
              className="absolute h-6 w-6 items-center justify-center rounded-full border-2 border-archive-900 bg-gold-400"
              style={{ left: `${percentage}%`, marginLeft: -12 }}
            >
              <View className="h-2 w-2 rounded-full bg-archive-900" />
            </View>
          ) : (
            <View className="absolute left-0 h-6 w-6 items-center justify-center rounded-full border border-archive-600 bg-archive-900">
              <View className="h-2 w-2 rounded-full bg-archive-500" />
            </View>
          )}
        </View>
        <View className="mt-2 flex-row justify-between">
          <Text className="text-xs font-semibold text-archive-300">
            {RATING_MIN}
          </Text>
          <Text className="text-xs font-semibold text-archive-300">
            {RATING_MAX}
          </Text>
        </View>
      </Pressable>

      {value ? (
        <Pressable
          accessibilityRole="button"
          className="self-start rounded-full border border-archive-600 px-3 py-2"
          onPress={() => onChange(null)}
        >
          <Text className="text-sm font-semibold text-gold-300">
            Clear rating
          </Text>
        </Pressable>
      ) : (
        <View className="rounded-app border border-archive-700 bg-archive-900/60 px-3 py-2">
          <Text className="text-sm leading-5 text-archive-300">
            Rating is optional. Leave it blank if you only want to track status.
          </Text>
        </View>
      )}
    </View>
  );
}
