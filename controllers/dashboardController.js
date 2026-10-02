const Job = require('../models/job');
const Campaign = require('../models/campaign');
const Application = require('../models/application');
const catchAsync = require('../utils/catchAsync');
const { ownerFilter } = require('../utils/ownership');
const { summarize } = require('../services/optimizer');
const analytics = require('../services/analytics');

// Recruiter dashboard (an admin visiting /dashboard sees everything)
exports.recruiter = catchAsync(async (req, res) => {
  const filter = ownerFilter(req);

  const [
    jobCount,
    campaigns,
    recentApps,
    funnel
  ] = await Promise.all([
    Job.countDocuments(filter),

    Campaign.find(filter)
      .populate('job', 'title')
      .sort('-updatedAt'),

    Application.find(filter)
      .populate('campaign', 'title')
      .sort('-createdAt')
      .limit(6),

    analytics.applicationFunnel(filter)
  ]);

  const stats = analytics.overview(campaigns);

  const rows = campaigns.map(c => ({
    campaign: c,
    summary: summarize(c)
  }));

  res.render('dashboard/recruiter', {
    pageTitle: 'Dashboard',
    jobCount,
    rows,
    recentApps,
    funnel,
    stats
  });
});

// Analytics page
exports.analyticsPage = catchAsync(async (req, res) => {
  const filter = ownerFilter(req);

  const campaigns = await Campaign.find(filter);

  const stats = analytics.overview(campaigns);

  const funnel = await analytics.applicationFunnel(filter);

  res.render('analytics/index', {
    pageTitle: 'Analytics',
    stats,
    funnel
  });
});