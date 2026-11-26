export type CategoryId =
  | 'general'
  | 'science'
  | 'history'
  | 'geography'
  | 'screen'
  | 'music'
  | 'sports'
  | 'food'
  | 'tech';

export interface Category {
  id: CategoryId;
  name: string;
  icon: string;
  color: string;
}

export const CATEGORIES: readonly Category[] = [
  { id: 'general', name: 'General Knowledge', icon: '💡', color: '#ffcc33' },
  { id: 'science', name: 'Science', icon: '🧪', color: '#38e1ff' },
  { id: 'history', name: 'History', icon: '🏛️', color: '#ff8a3d' },
  { id: 'geography', name: 'Geography', icon: '🌍', color: '#3dff9a' },
  { id: 'screen', name: 'Movies & TV', icon: '🎬', color: '#ff4fa3' },
  { id: 'music', name: 'Music', icon: '🎵', color: '#b46bff' },
  { id: 'sports', name: 'Sports', icon: '🏆', color: '#4f7dff' },
  { id: 'food', name: 'Food & Drink', icon: '🍕', color: '#ff5c5c' },
  { id: 'tech', name: 'Tech & Gaming', icon: '🎮', color: '#7cf03d' },
];

export function getCategory(id: CategoryId): Category {
  const c = CATEGORIES.find((x) => x.id === id);
  if (!c) throw new Error(`Unknown category: ${id}`);
  return c;
}
