const express = require('express');
const Campaign = require('../models/campaign');
const Platform = require('../models/platform');
const catchAsync = require('../utils/catchAsync');
const AppError = require('../utils/AppError');
const { protect } = require('../middleware/auth');
const { ownerFilter, findOwned } = require('../utils/ownership');
const {
  summarize,
  optimize,
  simulateDay,
  recommendAllocation,
  applyRecommendation
} = require('../services/optimizer');
const { loadSampleData } = require('../services/seed');
const {
  createSimulatedApplications
} = require('../services/applications');
const analytics = require('../services/analytics');

const router = express.Router();

router.use(protect); // every /api route needs a logged-in user

const payload = (campaign, extra = {}) => ({
  success: true,
  campaign: campaign.toJSON(),
  summary: summarize(campaign),
  ...extra
});

const loadCampaign = req =>
  findOwned(Campaign, req, req.params.id); // ownership check

function mustBeRunning(campaign) {
  if (['Paused', 'Completed'].includes(campaign.status)) {
    throw new AppError(
      `This campaign is ${campaign.status.toLowerCase()}. Change its status first.`,
      400
    );
  }
}

router.get(
  '/campaigns/:id',
  catchAsync(async (req, res) => {
    res.json(payload(await loadCampaign(req)));
  })
);

router.post(
  '/campaigns/:id/optimize',
  catchAsync(async (req, res) => {
    const campaign = await loadCampaign(req);

    mustBeRunning(campaign);

    const { message, moves } = optimize(campaign);

    await campaign.save();

    res.json(
      payload(campaign, {
        message,
        moves
      })
    );
  })
);

router.post(
  '/campaigns/:id/simulate',
  catchAsync(async (req, res) => {
    const campaign = await loadCampaign(req);

    mustBeRunning(campaign);

    const platforms = await Platform.find();

    const byName = Object.fromEntries(
      platforms.map(p => [p.name, p])
    );

    const created = simulateDay(
      campaign,
      byName
    );

    await campaign.save();

    await createSimulatedApplications(
      campaign,
      created
    ); // also create the candidate records

    res.json(
      payload(campaign, {
        message: 'One day of spend simulated.'
      })
    );
  })
);

router.post(
  '/campaigns/:id/reset',
  catchAsync(async (req, res) => {
    const campaign = await loadCampaign(req);

    await loadSampleData(campaign);

    await campaign.save();

    res.json(
      payload(campaign, {
        message: 'Sample data loaded.'
      })
    );
  })
);

router.get(
  '/campaigns/:id/recommendation',
  catchAsync(async (req, res) => {
    const campaign = await loadCampaign(req);

    res.json({
      success: true,
      recommendation: recommendAllocation(campaign)
    });
  })
);

router.post(
  '/campaigns/:id/recommendation/apply',
  catchAsync(async (req, res) => {
    const campaign = await loadCampaign(req);

    mustBeRunning(campaign);

    const { message, moves } =
      applyRecommendation(campaign);

    await campaign.save();

    res.json(
      payload(campaign, {
        message,
        moves
      })
    );
  })
);

router.get(
  '/campaigns/:id/analytics',
  catchAsync(async (req, res) => {
    const campaign = await loadCampaign(req);

    res.json({
      success: true,
      summary: summarize(campaign),
      ...analytics.campaignAnalytics(campaign)
    });
  })
);

// Overview across all of the user's campaigns (admin: everyone's)
router.get(
  '/analytics',
  catchAsync(async (req, res) => {
    const campaigns = await Campaign.find(
      ownerFilter(req)
    );

    res.json({
      success: true,
      ...analytics.overview(campaigns),
      funnel: await analytics.applicationFunnel(
        ownerFilter(req)
      )
    });
  })
);

module.exports = router;