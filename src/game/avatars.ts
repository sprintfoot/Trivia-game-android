/**
 * Original cartoon avatars, drawn as SVG. Each player picks one when they join; it shows on the
 * TV and gets a tomato or a bop on the head for a wrong answer.
 */
export type Mood = 'idle' | 'happy' | 'sad';

type Shape = 'blob' | 'cat' | 'bear' | 'robot' | 'alien' | 'monster' | 'ghost' | 'bird';

interface AvatarDef {
  id: string;
  name: string;
  shape: Shape;
  color: string;
  dark: string;
}

export const AVATARS: readonly AvatarDef[] = [
  { id: 'blob-pink', name: 'Bubbles', shape: 'blob', color: '#ff6bd6', dark: '#b8329a' },
  { id: 'cat-orange', name: 'Whiskers', shape: 'cat', color: '#ffa24d', dark: '#c2661a' },
  { id: 'bear-brown', name: 'Cubby', shape: 'bear', color: '#c98a5a', dark: '#8a5530' },
  { id: 'robot-blue', name: 'Bolt', shape: 'robot', color: '#5aa7ff', dark: '#2d64b3' },
  { id: 'alien-green', name: 'Zib', shape: 'alien', color: '#7dea6a', dark: '#3d9c2f' },
  { id: 'monster-purple', name: 'Grumbo', shape: 'monster', color: '#a77bff', dark: '#6a3fd1' },
  { id: 'ghost-white', name: 'Boo', shape: 'ghost', color: '#eef2ff', dark: '#9aa3c7' },
  { id: 'bird-yellow', name: 'Peep', shape: 'bird', color: '#ffd84d', dark: '#c99a12' },
  { id: 'blob-cyan', name: 'Splash', shape: 'blob', color: '#38e1ff', dark: '#1597b3' },
  { id: 'cat-grey', name: 'Smokey', shape: 'cat', color: '#a9b0c4', dark: '#686f86' },
  { id: 'bear-panda', name: 'Bamboo', shape: 'bear', color: '#f4f4f4', dark: '#2b2b38' },
  { id: 'robot-red', name: 'Sparky', shape: 'robot', color: '#ff5a6e', dark: '#b3263a' },
  { id: 'alien-teal', name: 'Glorp', shape: 'alien', color: '#35d6b2', dark: '#178a70' },
  { id: 'monster-orange', name: 'Chomp', shape: 'monster', color: '#ff7a3d', dark: '#b8441a' },
  { id: 'ghost-lilac', name: 'Wisp', shape: 'ghost', color: '#d6c2ff', dark: '#8c72c9' },
  { id: 'bird-blue', name: 'Skye', shape: 'bird', color: '#6fc8ff', dark: '#2f86c0' },
];

export const DEFAULT_AVATAR = AVATARS[0].id;

export function avatarDef(id: string | undefined): AvatarDef {
  return AVATARS.find((a) => a.id === id) ?? AVATARS[0];
}

export function randomAvatar(rng = Math.random): string {
  return AVATARS[Math.floor(rng() * AVATARS.length)].id;
}

function body(a: AvatarDef): string {
  const f = `fill="${a.color}" stroke="#1a0f4a" stroke-width="4"`;
  switch (a.shape) {
    case 'cat':
      return `<path d="M22 40 L26 10 L44 28 Z M78 40 L74 10 L56 28 Z" ${f} stroke-linejoin="round"/>
        <circle cx="50" cy="56" r="34" ${f}/>`;
    case 'bear':
      return `<circle cx="24" cy="28" r="12" fill="${a.dark}" stroke="#1a0f4a" stroke-width="4"/>
        <circle cx="76" cy="28" r="12" fill="${a.dark}" stroke="#1a0f4a" stroke-width="4"/>
        <circle cx="50" cy="56" r="34" ${f}/>
        ${a.id === 'bear-panda' ? `<ellipse cx="37" cy="52" rx="10" ry="12" fill="${a.dark}"/><ellipse cx="63" cy="52" rx="10" ry="12" fill="${a.dark}"/>` : ''}`;
    case 'robot':
      return `<line x1="50" y1="6" x2="50" y2="20" stroke="#1a0f4a" stroke-width="4"/>
        <circle cx="50" cy="7" r="6" fill="#ffcc33" stroke="#1a0f4a" stroke-width="3"/>
        <rect x="16" y="20" width="68" height="70" rx="14" ${f}/>
        <rect x="8" y="46" width="8" height="18" rx="3" fill="${a.dark}"/><rect x="84" y="46" width="8" height="18" rx="3" fill="${a.dark}"/>`;
    case 'alien':
      return `<path d="M36 26 Q30 8 22 6 M64 26 Q70 8 78 6" fill="none" stroke="#1a0f4a" stroke-width="4"/>
        <circle cx="22" cy="6" r="5" fill="${a.dark}"/><circle cx="78" cy="6" r="5" fill="${a.dark}"/>
        <ellipse cx="50" cy="56" rx="32" ry="36" ${f}/>`;
    case 'monster':
      return `<path d="M24 34 L18 8 L38 24 Z M76 34 L82 8 L62 24 Z" fill="#fff3c4" stroke="#1a0f4a" stroke-width="4" stroke-linejoin="round"/>
        <path d="M16 56 Q16 20 50 20 Q84 20 84 56 L84 86 L72 78 L61 88 L50 78 L39 88 L28 78 L16 86 Z" ${f} stroke-linejoin="round"/>`;
    case 'ghost':
      return `<path d="M18 90 L18 50 Q18 16 50 16 Q82 16 82 50 L82 90 L71 81 L61 90 L50 81 L39 90 L29 81 Z" ${f} stroke-linejoin="round"/>`;
    case 'bird':
      return `<path d="M44 18 Q48 4 56 12 Q60 4 62 18" fill="${a.dark}" stroke="#1a0f4a" stroke-width="3"/>
        <ellipse cx="50" cy="56" rx="34" ry="34" ${f}/>
        <path d="M14 60 Q4 56 8 46 Q16 50 18 54 Z M86 60 Q96 56 92 46 Q84 50 82 54 Z" fill="${a.dark}" stroke="#1a0f4a" stroke-width="3"/>`;
    default:
      return `<path d="M50 18 C78 18 86 40 84 60 C82 82 66 90 50 90 C30 90 16 80 16 58 C16 36 26 18 50 18 Z" ${f}/>`;
  }
}

function face(a: AvatarDef, mood: Mood): string {
  const ey = a.shape === 'robot' ? 46 : 50;
  const pupil = mood === 'sad' ? 3 : 1;
  const eyes =
    a.shape === 'robot'
      ? `<rect x="28" y="${ey - 9}" width="16" height="16" rx="4" fill="#fff" stroke="#1a0f4a" stroke-width="3"/>
         <rect x="56" y="${ey - 9}" width="16" height="16" rx="4" fill="#fff" stroke="#1a0f4a" stroke-width="3"/>
         <rect x="33" y="${ey - 4 + pupil}" width="6" height="6" fill="#1a0f4a"/><rect x="61" y="${ey - 4 + pupil}" width="6" height="6" fill="#1a0f4a"/>`
      : `<ellipse cx="38" cy="${ey}" rx="9" ry="10" fill="#fff" stroke="#1a0f4a" stroke-width="3"/>
         <ellipse cx="62" cy="${ey}" rx="9" ry="10" fill="#fff" stroke="#1a0f4a" stroke-width="3"/>
         <circle cx="39" cy="${ey + pupil}" r="4.5" fill="#1a0f4a"/><circle cx="63" cy="${ey + pupil}" r="4.5" fill="#1a0f4a"/>
         <circle cx="41" cy="${ey - 2 + pupil}" r="1.5" fill="#fff"/><circle cx="65" cy="${ey - 2 + pupil}" r="1.5" fill="#fff"/>`;
  const brows = mood === 'sad' ? `<path d="M30 ${ey - 16} L44 ${ey - 12} M70 ${ey - 16} L56 ${ey - 12}" stroke="#1a0f4a" stroke-width="3" stroke-linecap="round"/>` : '';
  const my = ey + 20;
  const mouth =
    a.shape === 'bird'
      ? `<path d="M42 ${my - 6} L58 ${my - 6} L50 ${mood === 'happy' ? my + 8 : my + 2} Z" fill="#ff9a1f" stroke="#1a0f4a" stroke-width="3" stroke-linejoin="round"/>`
      : mood === 'happy'
        ? `<path d="M36 ${my - 4} Q50 ${my + 16} 64 ${my - 4} Z" fill="#7a1030" stroke="#1a0f4a" stroke-width="3" stroke-linejoin="round"/>`
        : mood === 'sad'
          ? `<path d="M38 ${my + 6} Q50 ${my - 6} 62 ${my + 6}" fill="none" stroke="#1a0f4a" stroke-width="3.5" stroke-linecap="round"/>`
          : `<path d="M38 ${my} Q50 ${my + 10} 62 ${my}" fill="none" stroke="#1a0f4a" stroke-width="3.5" stroke-linecap="round"/>`;
  const cheeks = a.shape === 'robot' ? '' : `<circle cx="27" cy="${my - 4}" r="5" fill="#ff5a8a" opacity="0.45"/><circle cx="73" cy="${my - 4}" r="5" fill="#ff5a8a" opacity="0.45"/>`;
  return eyes + brows + cheeks + mouth;
}

/** The avatar as an SVG string. */
export function avatarSvg(id: string | undefined, mood: Mood = 'idle'): string {
  const a = avatarDef(id);
  return `<svg class="avatar-svg" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg" aria-label="${a.name}">${body(a)}${face(a, mood)}</svg>`;
}
