const mongoose = require('mongoose');
const Application = require('../models/application');
const Campaign = require('../models/campaign');
const Platform = require('../models/platform');
const catchAsync = require('../utils/catchAsync');
const { getErrors } = require('../utils/validate');
const { ownerFilter, findOwned } = require('../utils/ownership');
const {
  addToCounters,
  removeFromCounters,
  changeStatusCounters
} = require('../services/applications');

const STATUSES = [
  'New',
  'Screened',
  'Qualified',
  'Rejected',
  'Hired'
];

async function formData(req) {
  const campaigns = await Campaign.find(
    ownerFilter(req)
  ).sort('title');

  const platforms = await Platform.find().sort('name');

  return {
    campaigns,
    platforms,
    statuses: STATUSES
  };
}

exports.index = catchAsync(async (req, res) => {
  const filter = ownerFilter(req);

  if (STATUSES.includes(req.query.status)) {
    filter.status = req.query.status;
  }

  if (mongoose.isValidObjectId(req.query.campaign)) {
    filter.campaign = req.query.campaign;
  }

  const applications = await Application.find(filter)
    .populate('campaign', 'title')
    .populate('job', 'title')
    .sort('-createdAt')
    .limit(200);

  const campaigns = await Campaign.find(
    ownerFilter(req)
  ).sort('title');

  res.render('applications/index', {
    pageTitle: 'Applications',
    applications,
    campaigns,
    statuses: STATUSES,
    query: req.query
  });
});

exports.showNew = catchAsync(async (req, res) => {
  const data = await formData(req);

  res.render('applications/form', {
    pageTitle: 'Add application',
    heading: 'Add application',
    action: '/applications',
    isEdit: false,
    application: {
      campaign: req.query.campaign || '',
      status: 'New'
    },
    ...data
  });
});

exports.create = catchAsync(async (req, res) => {
  const errors = getErrors(req);

  // ownership check: the campaign must be one of yours
  const campaign = mongoose.isValidObjectId(req.body.campaign)
    ? await Campaign.findOne({
        _id: req.body.campaign,
        ...ownerFilter(req)
      })
    : null;

  if (!campaign) {
    errors.push('Choose one of your campaigns');
  } else if (
    !campaign.publishers.some(
      p => p.name === req.body.publisher
    )
  ) {
    errors.push(
      'That platform is not part of the selected campaign'
    );
  }

  if (errors.length) {
    const data = await formData(req);

    return res.status(400).render('applications/form', {
      pageTitle: 'Add application',
      heading: 'Add application',
      action: '/applications',
      isEdit: false,
      application: req.body,
      errors,
      ...data
    });
  }

  await Application.create({
    job: campaign.job,
    campaign: campaign._id,
    owner: campaign.owner,
    publisher: req.body.publisher,
    candidateName: req.body.candidateName,
    email: req.body.email,
    status: req.body.status,
    notes: req.body.notes
  });

  addToCounters(
    campaign,
    req.body.publisher,
    req.body.status
  );

  await campaign.save();

  res.redirect(
    '/applications?msg=' +
      encodeURIComponent('Application added')
  );
});

exports.showEdit = catchAsync(async (req, res) => {
  const application = await findOwned(
    Application,
    req,
    req.params.id
  );

  await application.populate('campaign', 'title');

  res.render('applications/form', {
    pageTitle: 'Edit application',
    heading: 'Edit application',
    action: `/applications/${application._id}/edit`,
    isEdit: true,
    application,
    statuses: STATUSES,
    campaigns: [],
    platforms: []
  });
});

exports.update = catchAsync(async (req, res) => {
  const application = await findOwned(
    Application,
    req,
    req.params.id
  );

  const errors = getErrors(req);

  if (errors.length) {
    await application.populate('campaign', 'title');

    return res.status(400).render('applications/form', {
      pageTitle: 'Edit application',
      heading: 'Edit application',
      action: `/applications/${application._id}/edit`,
      isEdit: true,
      application: {
        ...req.body,
        _id: application._id,
        campaign: application.campaign,
        publisher: application.publisher
      },
      statuses: STATUSES,
      campaigns: [],
      platforms: [],
      errors
    });
  }

  const oldStatus = application.status;

  const campaign = await Campaign.findById(
    application.campaign
  );

  if (campaign) {
    changeStatusCounters(
      campaign,
      application.publisher,
      oldStatus,
      req.body.status
    );

    await campaign.save();
  }

  application.set({
    candidateName: req.body.candidateName,
    email: req.body.email,
    status: req.body.status,
    notes: req.body.notes
  });

  await application.save();

  res.redirect(
    '/applications?msg=' +
      encodeURIComponent('Application updated')
  );
});

exports.remove = catchAsync(async (req, res) => {
  const application = await findOwned(
    Application,
    req,
    req.params.id
  );

  const campaign = await Campaign.findById(
    application.campaign
  );

  if (campaign) {
    removeFromCounters(
      campaign,
      application.publisher,
      application.status
    );

    await campaign.save();
  }

  await application.deleteOne();

  res.redirect(
    '/applications?msg=' +
      encodeURIComponent('Application deleted')
  );
});