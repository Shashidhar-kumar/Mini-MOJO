const Job = require('../models/job');
const Campaign = require('../models/campaign');
const Application = require('../models/application');
const catchAsync = require('../utils/catchAsync');
const { getErrors } = require('../utils/validate');
const { ownerFilter, findOwned } = require('../utils/ownership');
const { summarize } = require('../services/optimizer');

const fields = body => ({
  title: body.title,
  company: body.company,
  location: body.location,
  description: body.description,
  status: body.status
});

exports.index = catchAsync(async (req, res) => {
  const jobs = await Job.find(ownerFilter(req))
    .populate('owner', 'name')
    .sort('-createdAt');

  res.render('jobs/index', {
    pageTitle: 'Jobs',
    jobs
  });
});

exports.showNew = (req, res) => {
  res.render('jobs/form', {
    pageTitle: 'New job',
    heading: 'New job',
    action: '/jobs',
    job: { status: 'Open' }
  });
};

exports.create = catchAsync(async (req, res) => {
  const errors = getErrors(req);

  if (errors.length) {
    return res.status(400).render('jobs/form', {
      pageTitle: 'New job',
      heading: 'New job',
      action: '/jobs',
      job: req.body,
      errors
    });
  }

  await Job.create({
    ...fields(req.body),
    owner: req.user._id
  });

  res.redirect('/jobs?msg=' + encodeURIComponent('Job created'));
});

exports.show = catchAsync(async (req, res) => {
  const job = await findOwned(Job, req, req.params.id);

  await job.populate('owner', 'name');

  const campaigns = await Campaign.find({
    job: job._id
  }).sort('-createdAt');

  const rows = campaigns.map(c => ({
    campaign: c,
    summary: summarize(c)
  }));

  const applicationCount = await Application.countDocuments({
    job: job._id
  });

  res.render('jobs/show', {
    pageTitle: job.title,
    job,
    rows,
    applicationCount
  });
});

exports.showEdit = catchAsync(async (req, res) => {
  const job = await findOwned(Job, req, req.params.id);

  res.render('jobs/form', {
    pageTitle: 'Edit job',
    heading: 'Edit job',
    action: `/jobs/${job._id}/edit`,
    job
  });
});

exports.update = catchAsync(async (req, res) => {
  const job = await findOwned(Job, req, req.params.id);
  const errors = getErrors(req);

  if (errors.length) {
    return res.status(400).render('jobs/form', {
      pageTitle: 'Edit job',
      heading: 'Edit job',
      action: `/jobs/${job._id}/edit`,
      job: {
        ...req.body,
        _id: job._id
      },
      errors
    });
  }

  job.set(fields(req.body));
  await job.save();

  res.redirect(
    '/jobs/' + job._id + '?msg=' + encodeURIComponent('Job updated')
  );
});

exports.remove = catchAsync(async (req, res) => {
  const job = await findOwned(Job, req, req.params.id);

  await Application.deleteMany({
    job: job._id
  });

  await Campaign.deleteMany({
    job: job._id
  });

  await job.deleteOne();

  res.redirect(
    '/jobs?msg=' + encodeURIComponent('Job and its campaigns were deleted')
  );
});