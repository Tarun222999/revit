import { Ionicons } from '@expo/vector-icons';
import { Pressable, Text, View, type GestureResponderEvent } from 'react-native';

import { RATING_MAX, RATING_MIN, RATING_STEP } from '@/constants/ratings';

type RatingInputProps = {
  value: number | null;
  onChange: (value: number | null) => void;
};

const STAR_COUNT = RATING_MAX;
const STAR_TOUCH_WIDTH = 44;

function clampRating(value: number) {
  return Math.min(RATING_MAX, Math.max(RATING_MIN, value));
}

function getStarIcon(starValue: number, rating: number | null) {
  if (!rating || rating < starValue - RATING_STEP) {
    return 'star-outline';
  }

  if (rating >= starValue) {
    return 'star';
  }

  return 'star-half';
}

function getRatingFromStarPress(
  starValue: number,
  event: GestureResponderEvent,
) {
  const isHalfStar = event.nativeEvent.locationX <= STAR_TOUCH_WIDTH / 2;
  return clampRating(starValue - (isHalfStar ? RATING_STEP : 0));
}

export function RatingInput({ value, onChange }: RatingInputProps) {
  const ratingLabel = value ? `${value.toFixed(1)} / ${RATING_MAX}` : 'Not rated';

  const adjustRating = (direction: 'increment' | 'decrement') => {
    const baseValue = value ?? 0;
    const nextValue =
      direction === 'increment'
        ? baseValue + RATING_STEP
        : baseValue - RATING_STEP;

    if (nextValue < RATING_MIN) {
      onChange(null);
      return;
    }

    onChange(clampRating(nextValue));
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
        <Text className="text-sm font-bold text-gold-300">{ratingLabel}</Text>
      </View>

      <View
        accessibilityActions={[
          { name: 'increment', label: 'Increase rating' },
          { name: 'decrement', label: 'Decrease rating' },
        ]}
        accessibilityHint="Tap the left or right side of a star to choose half or full stars."
        accessibilityLabel={`Rating, ${ratingLabel}`}
        accessibilityRole="adjustable"
        className="rounded-app border border-archive-700 bg-archive-800 p-3"
        onAccessibilityAction={(event) => {
          if (event.nativeEvent.actionName === 'increment') {
            adjustRating('increment');
          }

          if (event.nativeEvent.actionName === 'decrement') {
            adjustRating('decrement');
          }
        }}>
        <View className="flex-row items-center justify-between">
          {Array.from({ length: STAR_COUNT }, (_, index) => {
            const starValue = index + 1;
            const starIcon = getStarIcon(starValue, value);

            return (
              <Pressable
                accessibilityLabel={`Set rating to ${starValue - RATING_STEP} or ${starValue}`}
                accessibilityRole="button"
                className="h-11 w-11 items-center justify-center rounded-full"
                hitSlop={4}
                key={starValue}
                onPress={(event) => {
                  onChange(getRatingFromStarPress(starValue, event));
                }}>
                <Ionicons
                  color={starIcon === 'star-outline' ? '#8b7355' : '#f4c95d'}
                  name={starIcon}
                  size={32}
                />
              </Pressable>
            );
          })}
        </View>

        <View className="mt-3 flex-row justify-between px-1">
          <Text className="text-xs font-semibold text-archive-300">
            {RATING_MIN.toFixed(1)}
          </Text>
          <Text className="text-xs font-semibold text-archive-300">
            {RATING_MAX.toFixed(1)}
          </Text>
        </View>
      </View>

      {value ? (
        <Pressable
          accessibilityRole="button"
          className="self-start rounded-full border border-archive-600 px-3 py-2"
          onPress={() => onChange(null)}>
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
