'use strict';

const assert = require('assert');

// Inline the helpers under test so we don't need the full server running
function collectVotesFromResult(result) {
  var votes = { a: 0, b: 0 };
  result.rows.forEach(function (row) {
    votes[row.vote] = parseInt(row.count);
  });
  return votes;
}

function getPercentages(a, b) {
  var result = {};
  if (a + b > 0) {
    result.a = Math.round(a / (a + b) * 100);
    result.b = 100 - result.a;
  } else {
    result.a = result.b = 50;
  }
  return result;
}

function mergeLabels(votes, labels) {
  return Object.assign({}, votes, labels);
}

describe('collectVotesFromResult', function () {
  it('returns zeros when result is empty', function () {
    var result = collectVotesFromResult({ rows: [] });
    assert.strictEqual(result.a, 0);
    assert.strictEqual(result.b, 0);
  });

  it('counts votes for a and b correctly', function () {
    var result = collectVotesFromResult({
      rows: [
        { vote: 'a', count: '5' },
        { vote: 'b', count: '3' }
      ]
    });
    assert.strictEqual(result.a, 5);
    assert.strictEqual(result.b, 3);
  });

  it('handles a single option having no votes', function () {
    var result = collectVotesFromResult({
      rows: [{ vote: 'a', count: '10' }]
    });
    assert.strictEqual(result.a, 10);
    assert.strictEqual(result.b, 0);
  });
});

describe('getPercentages', function () {
  it('returns 50/50 when no votes', function () {
    var p = getPercentages(0, 0);
    assert.strictEqual(p.a, 50);
    assert.strictEqual(p.b, 50);
  });

  it('returns 100/0 when all votes for a', function () {
    var p = getPercentages(10, 0);
    assert.strictEqual(p.a, 100);
    assert.strictEqual(p.b, 0);
  });

  it('calculates percentages correctly', function () {
    var p = getPercentages(1, 3);
    assert.strictEqual(p.a, 25);
    assert.strictEqual(p.b, 75);
  });

  it('percentages always sum to 100', function () {
    var p = getPercentages(7, 3);
    assert.strictEqual(p.a + p.b, 100);
  });
});

describe('mergeLabels (dynamic label logic)', function () {
  it('merges labels into votes payload', function () {
    var votes = { a: 3, b: 7 };
    var labels = { option_a: 'Dogs', option_b: 'Cats' };
    var payload = mergeLabels(votes, labels);
    assert.strictEqual(payload.option_a, 'Dogs');
    assert.strictEqual(payload.option_b, 'Cats');
    assert.strictEqual(payload.a, 3);
    assert.strictEqual(payload.b, 7);
  });

  it('uses provided labels even when votes are zero', function () {
    var votes = { a: 0, b: 0 };
    var labels = { option_a: 'Pizza', option_b: 'Tacos' };
    var payload = mergeLabels(votes, labels);
    assert.strictEqual(payload.option_a, 'Pizza');
    assert.strictEqual(payload.option_b, 'Tacos');
  });
});
