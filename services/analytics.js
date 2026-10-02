const Application = require('../models/application');
const { round } = require('./optimizer');

// Adds CPA, Qualified CPA and qualification rate
// to a { spent, apps, qualifiedApps } row
function withMetrics(row) {
  return {
    ...row,

    spent: round(row.spent),

    allocated:
      round(row.allocated || 0),

    cpa:
      row.apps > 0
        ? round(row.spent / row.apps)
        : 0,

    qualifiedCPA:
      row.qualifiedApps > 0
        ? round(
            row.spent /
            row.qualifiedApps
          )
        : 0,

    qualRate:
      row.apps > 0
        ? Math.round(
            (row.qualifiedApps /
              row.apps) *
              100
          )
        : 0
  };
}

// Analytics for ONE campaign
function campaignAnalytics(campaign) {
  const publishers =
    campaign.publishers.map(
      p =>
        withMetrics({
          name: p.name,
          allocated: p.allocated,
          spent: p.spent,
          apps: p.apps,
          qualifiedApps:
            p.qualifiedApps || 0
        })
    );

  const withData =
    publishers.filter(
      p => p.qualifiedApps > 0
    );

  const byQualified =
    [...withData].sort(
      (a, b) =>
        a.qualifiedCPA -
        b.qualifiedCPA
    );

  return {
    publishers,

    best:
      byQualified[0]
        ? byQualified[0].name
        : null,

    worst:
      byQualified.length > 1
        ? byQualified[
            byQualified.length - 1
          ].name
        : null
  };
}

// Totals + per-platform numbers
// across many campaigns
function overview(campaigns) {
  const byPlatform = {};

  campaigns.forEach(c =>
    c.publishers.forEach(p => {
      const row =
        byPlatform[p.name] ||
        (byPlatform[p.name] = {
          name: p.name,
          allocated: 0,
          spent: 0,
          apps: 0,
          qualifiedApps: 0
        });

      row.allocated +=
        p.allocated;

      row.spent += p.spent;

      row.apps += p.apps;

      row.qualifiedApps +=
        p.qualifiedApps || 0;
    })
  );

  const rows =
    Object.values(byPlatform);

  const totals =
    withMetrics(
      rows.reduce(
        (t, r) => ({
          allocated:
            t.allocated +
            r.allocated,

          spent:
            t.spent +
            r.spent,

          apps:
            t.apps +
            r.apps,

          qualifiedApps:
            t.qualifiedApps +
            r.qualifiedApps
        }),
        {
          allocated: 0,
          spent: 0,
          apps: 0,
          qualifiedApps: 0
        }
      )
    );

  const platforms =
    rows
      .map(withMetrics)
      .sort(
        (a, b) =>
          (a.cpa || 1e9) -
          (b.cpa || 1e9)
      );

  return {
    totals,
    platforms
  };
}

// How many applications are at each status
// e.g. { New: 4, Qualified: 7 }
async function applicationFunnel(filter) {
  const rows =
    await Application.aggregate([
      {
        $match: filter
      },
      {
        $group: {
          _id: '$status',
          n: { $sum: 1 }
        }
      }
    ]);

  const funnel = {
    New: 0,
    Screened: 0,
    Qualified: 0,
    Hired: 0,
    Rejected: 0
  };

  rows.forEach(r => {
    funnel[r._id] = r.n;
  });

  return funnel;
}

module.exports = {
  withMetrics,
  campaignAnalytics,
  overview,
  applicationFunnel
};