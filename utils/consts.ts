export const CATEGORIES = [
  'history',
  'science',
  'sports and games',
  'technology',
  'arts and culture',
  'philosophy and religion',
  'geography',
  'society and politics',
  'business and economics',
  'health and medicine',
] as const;

export type CategoryType = typeof CATEGORIES[number];