export const PROFILE_COLORS = [
  '#E74C3C',
  '#3498DB',
  '#2ECC71',
  '#F39C12',
  '#9B59B6',
  '#1ABC9C',
  '#E67E22',
  '#34495E',
] as const;

export type TravelerType = 'hiker' | 'cyclist' | 'staff' | 'other';

export const TRAVELER_TYPES: { value: TravelerType; label: string }[] = [
  { value: 'hiker', label: 'מטייל/ת ברגל' },
  { value: 'cyclist', label: 'רוכב/ת אופניים' },
  { value: 'other', label: 'אחר' },
];
