/**
 * Generisani posteri (pink / crna / bijela) za događaje i nagrade bez slike.
 * Varijanta se bira deterministički iz `seed` (npr. id događaja) — isti događaj uvijek ima isti poster.
 */
const P = '#ff0a78', K = '#070708', W = '#ffffff';
const KINDS = ['rings', 'grid', 'stripes', 'dots', 'wave', 'sun'] as const;

function hash(seed: string): number {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) | 0;
  return Math.abs(h);
}

export function posterFor(seed: string) {
  const h = hash(seed);
  const base = KINDS[h % KINDS.length];
  const inv = (h >> 3) % 3 === 0 && base !== 'grid' && base !== 'wave' && base !== 'sun';
  const bg = inv ? W : P;
  const fg = inv ? P : K;
  let g = '';
  switch (base) {
    case 'rings':
      for (let r = 20; r < 260; r += 22) g += `<circle cx="300" cy="40" r="${r}" fill="none" stroke="${fg}" stroke-width="7" opacity=".9"/>`;
      break;
    case 'grid':
      g = `<rect width="400" height="280" fill="${K}"/>`;
      for (let x = 0; x <= 400; x += 28) g += `<line x1="${x}" y1="0" x2="${200 + (x - 200) * 2.4}" y2="280" stroke="${P}" stroke-width="1.5" opacity=".75"/>`;
      for (let y = 120, s = 8; y < 280; y += s, s *= 1.35) g += `<line x1="0" y1="${y}" x2="400" y2="${y}" stroke="${P}" stroke-width="1.5" opacity=".75"/>`;
      g += `<circle cx="200" cy="112" r="56" fill="${P}"/>`;
      break;
    case 'stripes':
      for (let i = -10; i < 20; i++) g += `<rect x="${i * 34}" y="-40" width="14" height="400" fill="${fg}" transform="rotate(-24 200 140)"/>`;
      break;
    case 'dots':
      g = `<rect width="400" height="280" fill="${inv ? K : W}"/>`;
      for (let x = 14; x < 400; x += 28) for (let y = 14; y < 280; y += 28) {
        const r = 3 + 8 * Math.max(0, 1 - Math.hypot(x - 320, y - 60) / 260);
        g += `<circle cx="${x}" cy="${y}" r="${r.toFixed(1)}" fill="${P}"/>`;
      }
      break;
    case 'wave':
      g = `<rect width="400" height="280" fill="${K}"/>`;
      for (let i = 0; i < 9; i++) {
        const y = 40 + i * 22;
        g += `<path d="M0 ${y} C 100 ${y - 40}, 200 ${y + 40}, 400 ${y - 10}" fill="none" stroke="${i % 3 ? P : W}" stroke-width="4"/>`;
      }
      break;
    case 'sun':
      g = `<rect width="400" height="280" fill="${K}"/><circle cx="200" cy="200" r="120" fill="${P}"/>`;
      for (let i = 0; i < 6; i++) g += `<rect x="60" y="${150 + i * 18}" width="280" height="${4 + i * 1.5}" fill="${K}"/>`;
      break;
  }
  const light = (inv && base !== 'dots') || (base === 'dots' && !inv);
  return {
    svg: `<svg viewBox="0 0 400 280" preserveAspectRatio="xMidYMid slice" width="100%" height="100%" aria-hidden="true"><rect width="400" height="280" fill="${bg}"/>${g}</svg>`,
    text: light ? K : W,
  };
}

export function PosterArt({ seed, className = 'event__art' }: { seed: string; className?: string }) {
  // Sadržaj je naš generisani SVG (bez korisničkog unosa)
  return <div className={className} dangerouslySetInnerHTML={{ __html: posterFor(seed).svg }} />;
}
