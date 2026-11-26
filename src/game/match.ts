/**
 * Forgiving answer matching for typed (fill-in-the-blank) answers: ignores case, accents,
 * punctuation, "the/a/an", spaces, and allows a small typo in longer answers. Numbers can be
 * typed as digits or words.
 */
const NUMBER_WORDS: Record<string, string> = {
  zero: '0', one: '1', two: '2', three: '3', four: '4', five: '5', six: '6', seven: '7', eight: '8', nine: '9',
  ten: '10', eleven: '11', twelve: '12', thirteen: '13', fourteen: '14', fifteen: '15', sixteen: '16',
  seventeen: '17', eighteen: '18', nineteen: '19', twenty: '20', thirty: '30', forty: '40', fifty: '50',
  sixty: '60', seventy: '70', eighty: '80', ninety: '90', hundred: '100',
};

export function normalize(s: string): string {
  return s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9 ]+/g, ' ')
    .split(/\s+/)
    .filter((w) => w && !['the', 'a', 'an'].includes(w))
    .map((w) => NUMBER_WORDS[w] ?? w)
    .join('')
    .replace(/s$/, '');
}

export function editDistance(a: string, b: string): number {
  if (a === b) return 0;
  const prev = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    let diag = prev[0];
    prev[0] = i;
    for (let j = 1; j <= b.length; j++) {
      const tmp = prev[j];
      prev[j] = Math.min(prev[j] + 1, prev[j - 1] + 1, diag + (a[i - 1] === b[j - 1] ? 0 : 1));
      diag = tmp;
    }
  }
  return prev[b.length];
}

/** True if the typed guess matches any accepted answer. */
export function isMatch(guess: string, accepted: readonly string[]): boolean {
  const g = normalize(guess);
  if (!g) return false;
  return accepted.some((a) => {
    const n = normalize(a);
    if (g === n) return true;
    // Numbers must be exact; words may have a typo (1 for 5+ letters, 2 for 9+).
    if (/^\d+$/.test(n)) return false;
    const allowed = n.length >= 9 ? 2 : n.length >= 5 ? 1 : 0;
    return allowed > 0 && editDistance(g, n) <= allowed;
  });
}
