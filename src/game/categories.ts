export type CategoryId =
  | 'general'
  | 'screen'
  | 'disney'
  | 'tv'
  | 'music'
  | 'pop'
  | 'heroes'
  | 'animals'
  | 'sports'
  | 'food'
  | 'science'
  | 'space'
  | 'history'
  | 'geography'
  | 'holidays'
  | 'brands'
  | 'decades'
  | 'tech';

export interface Category {
  id: CategoryId;
  name: string;
  icon: string;
  color: string;
}

export const CATEGORIES: readonly Category[] = [
  { id: 'general', name: 'General Knowledge', icon: '💡', color: '#ffcc33' },
  { id: 'screen', name: 'Movies', icon: '🎬', color: '#ff4fa3' },
  { id: 'disney', name: 'Disney & Pixar', icon: '🏰', color: '#5ab4ff' },
  { id: 'tv', name: 'TV Shows', icon: '📺', color: '#ff7ad9' },
  { id: 'music', name: 'Music', icon: '🎵', color: '#b46bff' },
  { id: 'pop', name: 'Pop Stars', icon: '🎤', color: '#ff5ce1' },
  { id: 'heroes', name: 'Superheroes', icon: '🦸', color: '#ff3b3b' },
  { id: 'animals', name: 'Animals', icon: '🦁', color: '#ffa53d' },
  { id: 'sports', name: 'Sports', icon: '🏆', color: '#4f7dff' },
  { id: 'food', name: 'Food & Drink', icon: '🍕', color: '#ff5c5c' },
  { id: 'science', name: 'Science', icon: '🧪', color: '#38e1ff' },
  { id: 'space', name: 'Space', icon: '🚀', color: '#7a8cff' },
  { id: 'history', name: 'History', icon: '🏛️', color: '#ff8a3d' },
  { id: 'geography', name: 'Geography', icon: '🌍', color: '#3dff9a' },
  { id: 'holidays', name: 'Holidays', icon: '🎄', color: '#2fd06b' },
  { id: 'brands', name: 'Brands', icon: '🏷️', color: '#ffd84d' },
  { id: 'decades', name: 'Throwback', icon: '📼', color: '#ff9f6b' },
  { id: 'tech', name: 'Tech & Gaming', icon: '🎮', color: '#7cf03d' },
];

/** Picked on first launch; players can change them on the setup screen. */
export const DEFAULT_CATEGORIES: readonly CategoryId[] = ['general', 'screen', 'disney', 'tv', 'music', 'animals', 'sports', 'food'];

export function getCategory(id: CategoryId): Category {
  const c = CATEGORIES.find((x) => x.id === id);
  if (!c) throw new Error(`Unknown category: ${id}`);
  return c;
}
