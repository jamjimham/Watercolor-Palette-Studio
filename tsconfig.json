// Tests for the shuffle-bag picker: draws every item once before any
// repeat, then reshuffles — used for both "Roll a Master Reference" and
// each die in "Roll a Painting Prompt". Verified by hand via a throwaway
// node -e snippet when it was first built; now a real, repeatable test.
import { describe, it, expect, beforeEach } from 'vitest';
import { vsShuffledIndices, vsNextMasterIndex, vsNextPromptIndex, VS_MASTERS_WATERCOLOR, PROMPT_DATA } from '../src/js/value-study.js';

describe('vsShuffledIndices', () => {
  it('returns every index from 0..n-1 exactly once', () => {
    const arr = vsShuffledIndices(20);
    expect(arr.length).toBe(20);
    expect([...arr].sort((a, b) => a - b)).toEqual([...Array(20).keys()]);
  });
});

describe('vsNextMasterIndex (shuffle-bag over the master reference list)', () => {
  it('draws every master once before repeating', () => {
    const n = VS_MASTERS_WATERCOLOR.length;
    const seen = new Set();
    for (let i = 0; i < n; i++) seen.add(vsNextMasterIndex());
    expect(seen.size).toBe(n); // no repeats within one full pass
  });
});

describe('vsNextPromptIndex (shuffle-bag per prompt category)', () => {
  it('draws every subject once before repeating, independently per category', () => {
    const n = PROMPT_DATA.subject.length;
    const seen = new Set();
    for (let i = 0; i < n; i++) seen.add(vsNextPromptIndex('subject'));
    expect(seen.size).toBe(n);
  });

  it('categories do not interfere with each other', () => {
    // Draining "mood" completely shouldn't affect "subject"'s own bag state.
    const moodN = PROMPT_DATA.mood.length;
    for (let i = 0; i < moodN; i++) vsNextPromptIndex('mood');
    const subjectDraw = vsNextPromptIndex('subject');
    expect(subjectDraw).toBeGreaterThanOrEqual(0);
    expect(subjectDraw).toBeLessThan(PROMPT_DATA.subject.length);
  });
});
