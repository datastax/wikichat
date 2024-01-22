export const CATEGORIES = [
  'history',
  'science',
  'sports_and_games',
  'technology',
  'arts_and_entertainment',
  'philosophy_and_religion',
  'geography',
  'society_and_politics',
  'business_and_economics',
  'health_and_medicine',
] as const;

export type CategoryType = typeof CATEGORIES[number];