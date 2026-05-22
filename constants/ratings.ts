export const RATING_MIN = 0.5;
export const RATING_MAX = 5;
export const RATING_STEP = 0.5;

export function isValidRating(value: number) {
  return value >= RATING_MIN && value <= RATING_MAX && value % RATING_STEP === 0;
}
