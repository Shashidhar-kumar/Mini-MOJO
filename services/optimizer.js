// All the "programmatic" logic lives here, away from the routes.

const AppError = require('../utils/AppError');

const round = n => Math.round(n * 100) / 100;

// Fallback "true" cost per applicant,
// used only when a Platform record has none
const TRUE_CPA = {
  LinkedIn: 50,
  Indeed: 10,
  ZipRecruiter: 20,
  Glassdoor: 45
};

function summarize(campaign) {
  const totalSpent = campaign.publishers.reduce(
    (a, p) => a + p.spent,
    0
  );

  const totalApps = campaign.publishers.reduce(
    (a, p) => a + p.apps,
    0
  );

  const totalQualified = campaign.publishers.reduce(
    (a, p) => a + (p.qualifiedApps || 0),
    0
  );

  const totalAllocated = campaign.publishers.reduce(
    (a, p) => a + p.allocated,
    0
  );

  return {
    totalSpent: round(totalSpent),
    totalApps,
    totalQualified,
    totalAllocated: round(totalAllocated),
    unspent: round(totalAllocated - totalSpent),
    avgCPA: totalApps > 0
      ? round(totalSpent / totalApps)
      : 0,
    qualifiedCPA: totalQualified > 0
      ? round(totalSpent / totalQualified)
      : 0
  };
}

// Shift 30% of the UNSPENT budget from the worst
// channels to the best, weighted by inverse CPA
// (cheaper channel gets a bigger share).
function optimize(campaign) {
  const pubs = campaign.publishers;

  pubs.forEach(p => {
    p.cpa = p.apps > 0
      ? round(p.spent / p.apps)
      : 0;
  });

  const ranked = pubs
    .filter(p => p.apps > 0)
    .sort((a, b) => a.cpa - b.cpa);

  const n = Math.min(
    2,
    Math.floor(ranked.length / 2)
  );

  if (n < 1) {
    throw new AppError(
      'Not enough performance data yet. Simulate a day first.',
      400
    );
  }

  const winners = ranked.slice(0, n);
  const losers = ranked.slice(-n);

  const before = Object.fromEntries(
    pubs.map(p => [p.name, p.allocated])
  );

  let pool = 0;

  losers.forEach(p => {
    const remaining = Math.max(
      p.allocated - p.spent,
      0
    );

    const cut = round(remaining * 0.30);

    p.allocated = round(
      p.allocated - cut
    );

    pool += cut;
  });

  pool = round(pool);

  if (pool <= 0) {
    throw new AppError(
      'Nothing left to move. The weakest channels have no unspent budget.',
      400
    );
  }

  const weights = winners.map(
    p => 1 / Math.max(p.cpa, 0.01)
  );

  const wSum = weights.reduce(
    (a, b) => a + b,
    0
  );

  let given = 0;

  winners.forEach((p, i) => {
    const share =
      i === winners.length - 1
        ? round(pool - given)
        : round(pool * weights[i] / wSum);

    p.allocated = round(
      p.allocated + share
    );

    given += share;
  });

  const message =
    `Moved $${pool.toFixed(2)} from ` +
    `${losers.map(p => p.name).join(' and ')} to ` +
    `${winners.map(p => p.name).join(' and ')}.`;

  campaign.history.push({
    message,
    moved: pool
  });

  campaign.status = 'Optimized';

  const moves = pubs
    .map(p => ({
      name: p.name,
      delta: round(
        p.allocated - before[p.name]
      )
    }))
    .filter(m => m.delta !== 0);

  return {
    message,
    moves
  };
}

// Pretend one day of ads ran:
// each channel spends 10% of its allocation and gets
// applicants at its (noisy) CPA.
function simulateDay(
  campaign,
  platformsByName = {}
) {
  const created = [];

  campaign.publishers.forEach(p => {
    const remaining =
      p.allocated - p.spent;

    if (remaining <= 0) return;

    const plat = platformsByName[p.name];

    const baseCPA =
      (plat && plat.simulatedCPA) ||
      TRUE_CPA[p.name] ||
      25;

    const rate =
      plat && plat.qualityRate !== undefined
        ? plat.qualityRate
        : 0.3;

    const spend = round(
      Math.min(
        remaining,
        p.allocated * 0.10
      )
    );

    const cpa =
      baseCPA *
      (0.8 + Math.random() * 0.4);

    const newApps =
      Math.round(spend / cpa);

    let qualified = 0;

    for (let i = 0; i < newApps; i++) {
      if (Math.random() < rate) {
        qualified++;
      }
    }

    p.spent = round(
      p.spent + spend
    );

    p.apps += newApps;

    p.qualifiedApps =
      (p.qualifiedApps || 0) +
      qualified;

    p.cpa =
      p.apps > 0
        ? round(p.spent / p.apps)
        : 0;

    created.push({
      name: p.name,
      apps: newApps,
      qualified
    });
  });

  if (campaign.status === 'Optimized') {
    campaign.status = 'Active';
  }

  return created;
}

// Cost to get ONE QUALIFIED applicant
// from a publisher.
function costPerQualified(p) {
  if ((p.qualifiedApps || 0) > 0) {
    return p.spent / p.qualifiedApps;
  }

  if (p.apps > 0) {
    return (p.spent / p.apps) / 0.3;
  }

  return null;
}

// Recommend how to split the UNSPENT budget.
function recommendAllocation(campaign) {
  const pubs = campaign.publishers;

  const unspent = round(
    pubs.reduce(
      (a, p) =>
        a +
        Math.max(
          p.allocated - p.spent,
          0
        ),
      0
    )
  );

  if (unspent <= 0) {
    throw new AppError(
      'There is no unspent budget left to recommend a split for.',
      400
    );
  }

  const costs =
    pubs.map(costPerQualified);

  const known =
    costs.filter(c => c !== null);

  if (known.length === 0) {
    throw new AppError(
      'Not enough performance data yet. Simulate a day first.',
      400
    );
  }

  const avgCost =
    known.reduce((a, b) => a + b, 0) /
    known.length;

  const scores = costs.map(
    c =>
      1 /
      Math.max(
        c === null ? avgCost : c,
        0.01
      )
  );

  const scoreSum =
    scores.reduce((a, b) => a + b, 0);

  const floor = round(
    unspent * 0.10 / pubs.length
  );

  const flexible =
    unspent -
    floor * pubs.length;

  let given = 0;

  return pubs.map((p, i) => {
    const isLast =
      i === pubs.length - 1;

    const share = isLast
      ? round(unspent - given)
      : round(
          floor +
          flexible *
            scores[i] /
            scoreSum
        );

    given = round(
      given + share
    );

    const recommended =
      round(p.spent + share);

    return {
      name: p.name,
      spent: p.spent,
      current: p.allocated,
      recommended,
      change: round(
        recommended - p.allocated
      ),
      costPerQualified:
        costs[i] === null
          ? null
          : round(costs[i]),
      estimated:
        (p.qualifiedApps || 0) === 0
    };
  });
}

function applyRecommendation(campaign) {
  const rows =
    recommendAllocation(campaign);

  rows.forEach((r, i) => {
    campaign.publishers[i].allocated =
      r.recommended;
  });

  const moved = round(
    rows
      .filter(r => r.change > 0)
      .reduce(
        (a, r) => a + r.change,
        0
      )
  );

  const message =
    `Applied recommended split. ` +
    `$${moved.toFixed(2)} of unspent budget ` +
    `was rebalanced.`;

  campaign.history.push({
    message,
    moved
  });

  campaign.status = 'Optimized';

  return {
    message,
    moves: rows
      .filter(r => r.change !== 0)
      .map(r => ({
        name: r.name,
        delta: r.change
      }))
  };
}

module.exports = {
  round,
  summarize,
  optimize,
  simulateDay,
  recommendAllocation,
  applyRecommendation
};