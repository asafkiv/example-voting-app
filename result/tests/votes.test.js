'use strict';

const { collectVotesFromResult, getPercentages } = require('../lib/votes');

// ---------------------------------------------------------------------------
// collectVotesFromResult
// ---------------------------------------------------------------------------
describe('collectVotesFromResult', () => {
  test('returns zeros when result has no rows', () => {
    const result = { rows: [] };
    expect(collectVotesFromResult(result)).toEqual({ a: 0, b: 0 });
  });

  test('counts votes for option a only', () => {
    const result = { rows: [{ vote: 'a', count: '7' }] };
    expect(collectVotesFromResult(result)).toEqual({ a: 7, b: 0 });
  });

  test('counts votes for option b only', () => {
    const result = { rows: [{ vote: 'b', count: '3' }] };
    expect(collectVotesFromResult(result)).toEqual({ a: 0, b: 3 });
  });

  test('counts votes for both options', () => {
    const result = {
      rows: [
        { vote: 'a', count: '10' },
        { vote: 'b', count: '5' },
      ],
    };
    expect(collectVotesFromResult(result)).toEqual({ a: 10, b: 5 });
  });

  test('parses string counts to integers', () => {
    const result = { rows: [{ vote: 'a', count: '42' }] };
    const votes = collectVotesFromResult(result);
    expect(typeof votes.a).toBe('number');
    expect(votes.a).toBe(42);
  });
});

// ---------------------------------------------------------------------------
// getPercentages
// ---------------------------------------------------------------------------
describe('getPercentages', () => {
  test('returns 50/50 when both counts are zero', () => {
    expect(getPercentages(0, 0)).toEqual({ a: 50, b: 50 });
  });

  test('returns 100/0 when only option a has votes', () => {
    expect(getPercentages(5, 0)).toEqual({ a: 100, b: 0 });
  });

  test('returns 0/100 when only option b has votes', () => {
    expect(getPercentages(0, 5)).toEqual({ a: 0, b: 100 });
  });

  test('percentages sum to 100', () => {
    const { a, b } = getPercentages(3, 7);
    expect(a + b).toBe(100);
  });

  test('calculates percentages proportionally', () => {
    const { a, b } = getPercentages(1, 3);
    expect(a).toBe(25);
    expect(b).toBe(75);
  });

  test('rounds percentages to nearest integer', () => {
    // 1/3 ≈ 33.33% rounds to 33, complement is 67
    const { a, b } = getPercentages(1, 2);
    expect(a).toBe(33);
    expect(b).toBe(67);
  });

  test('handles large vote counts', () => {
    const { a, b } = getPercentages(1000000, 1000000);
    expect(a).toBe(50);
    expect(b).toBe(50);
  });
});

// ---------------------------------------------------------------------------
// Dynamic UI update simulation
// Verifies that successive score events produce correct cumulative state.
// ---------------------------------------------------------------------------
describe('dynamic UI update sequence', () => {
  function simulateUpdate(currentScope, data) {
    var a = parseInt(data.a || 0);
    var b = parseInt(data.b || 0);
    var percentages = getPercentages(a, b);
    return {
      aPercent: percentages.a,
      bPercent: percentages.b,
      total: a + b,
    };
  }

  test('initial state shows 50/50 with no votes', () => {
    var scope = simulateUpdate({}, { a: 0, b: 0 });
    expect(scope.aPercent).toBe(50);
    expect(scope.bPercent).toBe(50);
    expect(scope.total).toBe(0);
  });

  test('first vote for Modiin updates totals and percentages', () => {
    var scope = simulateUpdate({}, { a: 1, b: 0 });
    expect(scope.total).toBe(1);
    expect(scope.aPercent).toBe(100);
    expect(scope.bPercent).toBe(0);
  });

  test('first vote for Tel Aviv updates totals and percentages', () => {
    var scope = simulateUpdate({}, { a: 0, b: 1 });
    expect(scope.total).toBe(1);
    expect(scope.aPercent).toBe(0);
    expect(scope.bPercent).toBe(100);
  });

  test('successive score events update state correctly', () => {
    var scope = {};
    scope = simulateUpdate(scope, { a: 3, b: 1 });
    expect(scope.total).toBe(4);
    expect(scope.aPercent).toBe(75);
    expect(scope.bPercent).toBe(25);

    scope = simulateUpdate(scope, { a: 3, b: 3 });
    expect(scope.total).toBe(6);
    expect(scope.aPercent).toBe(50);
    expect(scope.bPercent).toBe(50);
  });

  test('missing score key defaults to zero', () => {
    // Server may omit a key if no votes exist for that option yet
    var scope = simulateUpdate({}, { b: 4 });
    expect(scope.total).toBe(4);
    expect(scope.aPercent).toBe(0);
    expect(scope.bPercent).toBe(100);
  });

  test('percentages always sum to 100 across random updates', () => {
    var pairs = [[0, 0], [1, 0], [0, 1], [5, 5], [7, 3], [1, 99]];
    pairs.forEach(function ([a, b]) {
      var scope = simulateUpdate({}, { a, b });
      expect(scope.aPercent + scope.bPercent).toBe(100);
    });
  });
});
