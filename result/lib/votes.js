/**
 * Collects vote counts from a PostgreSQL query result.
 * @param {object} result - pg query result with rows containing vote and count fields
 * @returns {{ a: number, b: number }}
 */
function collectVotesFromResult(result) {
  var votes = {a: 0, b: 0};

  result.rows.forEach(function (row) {
    votes[row.vote] = parseInt(row.count);
  });

  return votes;
}

/**
 * Computes display percentages for two vote options.
 * @param {number} a - vote count for option a
 * @param {number} b - vote count for option b
 * @returns {{ a: number, b: number }}
 */
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

module.exports = { collectVotesFromResult, getPercentages };
