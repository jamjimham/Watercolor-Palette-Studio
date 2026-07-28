// Tests for the Kubelka-Munk mixing math and Lab color-distance solver.
// These are exactly the functions that got hand-tested via throwaway
// `node -e "..."` snippets in nearly every past session before shipping —
// making them real tests means that verification work stops being
// reinvented from scratch every time.
import { describe, it, expect } from 'vitest';
import { mixPaintN, hexToLab, deltaE, deltaELabel, findColorMatches, chroma, mudInfo } from '../src/js/rendering-engine.js';

describe('mixPaintN (subtractive Kubelka-Munk mixing)', () => {
  it('mixing a color with itself returns the same color', () => {
    const result = mixPaintN([{ hex: '#2a3b8f', w: 1 }]);
    expect(result.toLowerCase()).toBe('#2a3b8f');
  });

  it('complementary colors mix toward a muddy neutral, not a bright average', () => {
    // Blue + orange under naive RGB averaging gives a garish mid-tone;
    // under real subtractive mixing it should read as a dark, low-chroma
    // neutral instead — this was the exact bug (bright purple vs muddy
    // neutral) that motivated switching to K-M in the first place.
    const mixed = mixPaintN([{ hex: '#2a3b8f', w: 1 }, { hex: '#c86a2a', w: 1 }]);
    const c = chroma(mixed);
    expect(c).toBeLessThan(0.35); // meaningfully desaturated, not vivid
  });

  it('weights bias the mix toward the heavier color', () => {
    const heavyBlue = mixPaintN([{ hex: '#2a3b8f', w: 0.9 }, { hex: '#f0d080', w: 0.1 }]);
    const heavyYellow = mixPaintN([{ hex: '#2a3b8f', w: 0.1 }, { hex: '#f0d080', w: 0.9 }]);
    const [, , blueDistToBlue] = [null, null, deltaE(heavyBlue, '#2a3b8f')];
    const [, , yellowDistToBlue] = [null, null, deltaE(heavyYellow, '#2a3b8f')];
    expect(blueDistToBlue).toBeLessThan(yellowDistToBlue);
  });
});

describe('deltaE / hexToLab (perceptual color distance)', () => {
  it('a color has zero distance from itself', () => {
    expect(deltaE('#8a6a4a', '#8a6a4a')).toBeCloseTo(0, 5);
  });

  it('black and white are maximally distant', () => {
    const d = deltaE('#000000', '#ffffff');
    expect(d).toBeGreaterThan(80); // Lab L alone spans 0-100
  });

  it('deltaELabel gives an excellent rating only for near-identical colors', () => {
    expect(deltaELabel(0.5).text).toBe('Excellent match');
    expect(deltaELabel(50).text).not.toBe('Excellent match');
  });
});

describe('findColorMatches (inverse mixing solver)', () => {
  const palette = [
    { name: 'Ultramarine', hex: '#2a3b8f' },
    { name: 'Burnt Sienna', hex: '#8a3b23' },
    { name: 'Yellow Ochre', hex: '#c8a030' },
  ];

  it('finds an exact or near-exact match for a color already in the palette', () => {
    const matches = findColorMatches(palette, '#2a3b8f', { maxResults: 3 });
    expect(matches[0].de).toBeLessThan(1);
    expect(matches[0].idxs).toEqual([0]);
  });

  it('returns results ranked best-to-worst by delta E', () => {
    const matches = findColorMatches(palette, '#6b5a48', { maxResults: 6 });
    for (let i = 1; i < matches.length; i++) {
      expect(matches[i].de).toBeGreaterThanOrEqual(matches[i - 1].de);
    }
  });

  it('never proposes a 0-weight component (that is really an n-1 case)', () => {
    const matches = findColorMatches(palette, '#6b5a48', { maxResults: 10 });
    matches.forEach(m => {
      m.weights.forEach(w => expect(w).toBeGreaterThan(0));
    });
  });
});

describe('mudInfo (muddy-mix detection)', () => {
  it('flags two vivid parents mixing to a dull result as muddy', () => {
    const mixed = mixPaintN([{ hex: '#2a3b8f', w: 1 }, { hex: '#c86a2a', w: 1 }]);
    const info = mudInfo('#2a3b8f', '#c86a2a', mixed);
    expect(info.muddy).toBe(true);
  });

  it('does not flag two similar colors mixing to a similar result', () => {
    const mixed = mixPaintN([{ hex: '#2a3b8f', w: 1 }, { hex: '#3a4b9f', w: 1 }]);
    const info = mudInfo('#2a3b8f', '#3a4b9f', mixed);
    expect(info.muddy).toBe(false);
  });
});
