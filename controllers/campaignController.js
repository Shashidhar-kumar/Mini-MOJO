const Campaign = require('../models/campaign');
const Job = require('../models/job');
const Platform = require('../models/platform');
const Application = require('../models/application');
const catchAsync = require('../utils/catchAsync');
const safeJson = require('../utils/safeJson');
const { getErrors } = require('../utils/validate');
const { ownerFilter, findOwned } = require('../utils/ownership');
const { round, summarize, recommendAllocation, applyRecommendation } = require('../services/optimizer');

async function formData(req) {
  const jobs = await Job.find({ ...ownerFilter(req), status: 'Open' }).sort('title');
  const platforms = await Platform.find({ active: true }).sort('name');
  return { jobs, platforms };
}

exports.index = catchAsync(async (req, res) => {
  const campaigns = await Campaign.find(ownerFilter(req))
    .populate('job', 'title').populate('owner', 'name').sort('-createdAt');
  const rows = campaigns.map(c => ({ campaign: c, summary: summarize(c) }));
  res.render('campaigns/index', { pageTitle: 'Campaigns', rows });
});

exports.showNew = catchAsync(async (req, res) => {
  const data = await formData(req);
  res.render('campaigns/form', { pageTitle: 'New campaign', isEdit: false, action: '/campaigns', values: { job: req.query.job || '', platforms: [] }, ...data });
});

exports.create = catchAsync(async (req, res) => {
  const errors = getErrors(req);
  const platformIds = [].concat(req.body.platforms || []);   // one checkbox = string, many = array

  let platforms = [];
  if (!errors.length) {
    platforms = await Platform.find({ _id: { $in: platformIds } });
    if (platforms.length === 0) errors.push('Choose at least one valid platform');
  }

  if (errors.length) {
    const data = await formData(req);
    return res.status(400).render('campaigns/form', {
      pageTitle: 'New campaign', isEdit: false, action: '/campaigns', errors,
      values: { ...req.body, platforms: platformIds }, ...data
    });
  }

  // Use the chosen job (ownership check: it must be yours) or create a new one right here
  let job;
  if (req.body.job) {
    job = await findOwned(Job, req, req.body.job);
  } else {
    job = await Job.create({
      title: req.body.newJobTitle.trim(),
      company: req.body.newJobCompany.trim(),
      location: (req.body.newJobLocation || '').trim(),
      status: 'Open',
      owner: req.user._id
    });
  }

  const total = Number(req.body.totalBudget);
  const each = round(total / platforms.length);
  // split the budget evenly; the last platform takes the rounding remainder
  const publishers = platforms.map((p, i) => ({
    name: p.name, platform: p._id,
    allocated: i === platforms.length - 1 ? round(total - each * (platforms.length - 1)) : each,
    spent: 0, apps: 0, qualifiedApps: 0, cpa: 0
  }));

  const campaign = await Campaign.create({
    title: req.body.title, job: job._id, owner: job.owner, totalBudget: total, publishers
  });
  res.redirect('/campaigns/' + campaign._id + '?msg=' + encodeURIComponent('Campaign created. Simulate a day to get data.'));
});

// The live dashboard for one campaign (your existing dashboard.ejs)
exports.show = catchAsync(async (req, res) => {
  const campaign = await findOwned(Campaign, req, req.params.id);
  res.render('dashboard', {
    title: campaign.title,
    campaignId: campaign._id,
    boot: safeJson({ campaign: campaign.toJSON(), summary: summarize(campaign) })
  });
});

exports.showEdit = catchAsync(async (req, res) => {
  const campaign = await findOwned(Campaign, req, req.params.id);
  res.render('campaigns/form', { pageTitle: 'Edit campaign', isEdit: true, action: `/campaigns/${campaign._id}/edit`, values: campaign });
});

exports.update = catchAsync(async (req, res) => {
  const campaign = await findOwned(Campaign, req, req.params.id);
  const errors = getErrors(req);
  if (errors.length) {
    return res.status(400).render('campaigns/form', {
      pageTitle: 'Edit campaign', isEdit: true, action: `/campaigns/${campaign._id}/edit`,
      values: { ...req.body, _id: campaign._id, totalBudget: campaign.totalBudget }, errors
    });
  }
  campaign.title = req.body.title;
  campaign.status = req.body.status;
  await campaign.save();
  res.redirect('/campaigns/' + campaign._id + '?msg=' + encodeURIComponent('Campaign updated'));
});

exports.remove = catchAsync(async (req, res) => {
  const campaign = await findOwned(Campaign, req, req.params.id);
  await Application.deleteMany({ campaign: campaign._id });
  await campaign.deleteOne();
  res.redirect('/campaigns?msg=' + encodeURIComponent('Campaign deleted'));
});

// Recommended budget split page
exports.showRecommendation = catchAsync(async (req, res) => {
  const campaign = await findOwned(Campaign, req, req.params.id);
  let rows = [];
  const errors = [];
  try {
    rows = recommendAllocation(campaign);
  } catch (err) {
    errors.push(err.message);
  }
  res.render('campaigns/recommendation', { pageTitle: 'Recommended split', campaign, rows, errors });
});

exports.applyRecommendation = catchAsync(async (req, res) => {
  const campaign = await findOwned(Campaign, req, req.params.id);
  const { message } = applyRecommendation(campaign);
  await campaign.save();
  res.redirect('/campaigns/' + campaign._id + '?msg=' + encodeURIComponent(message));
});