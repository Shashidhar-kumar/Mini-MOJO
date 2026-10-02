const User = require('../models/user');
const Job = require('../models/job');
const Campaign = require('../models/campaign');
const Application = require('../models/application');
const catchAsync = require('../utils/catchAsync');
const AppError = require('../utils/AppError');
const {
  round,
  summarize
} = require('../services/optimizer');
const analytics = require('../services/analytics');

const countFor = (list, user) =>
  (
    list.find(
      x => String(x._id) === String(user._id)
    ) || { n: 0 }
  ).n;

exports.dashboard = catchAsync(async (req, res) => {
  const [
    users,
    campaigns,
    jobCounts,
    appCounts
  ] = await Promise.all([
    User.find().sort('name'),

    Campaign.find()
      .populate('job', 'title')
      .populate('owner', 'name')
      .sort('-updatedAt'),

    Job.aggregate([
      {
        $group: {
          _id: '$owner',
          n: { $sum: 1 }
        }
      }
    ]),

    Application.aggregate([
      {
        $group: {
          _id: '$owner',
          n: { $sum: 1 }
        }
      }
    ])
  ]);

  const userRows = users.map(u => {
    const mine = campaigns.filter(
      c =>
        c.owner &&
        String(c.owner._id) === String(u._id)
    );

    return {
      user: u,
      jobs: countFor(jobCounts, u),
      campaigns: mine.length,
      applications: countFor(appCounts, u),
      spent: round(
        mine.reduce(
          (a, c) =>
            a + summarize(c).totalSpent,
          0
        )
      )
    };
  });

  const rows = campaigns
    .slice(0, 10)
    .map(c => ({
      campaign: c,
      summary: summarize(c)
    }));

  res.render('dashboard/admin', {
    pageTitle: 'Admin',
    userRows,
    rows,
    stats: analytics.overview(campaigns)
  });
});

exports.toggleRole = catchAsync(async (req, res) => {
  const user = await User.findById(
    req.params.id
  ).catch(() => null);

  if (!user) {
    throw new AppError('User not found', 404);
  }

  if (
    String(user._id) ===
    String(req.user._id)
  ) {
    throw new AppError(
      'You cannot change your own role.',
      400
    );
  }

  user.role =
    user.role === 'admin'
      ? 'recruiter'
      : 'admin';

  await user.save();

  res.redirect(
    '/admin?msg=' +
      encodeURIComponent(
        `${user.name} is now ${user.role}`
      )
  );
});

exports.deleteUser = catchAsync(async (req, res) => {
  const user = await User.findById(
    req.params.id
  ).catch(() => null);

  if (!user) {
    throw new AppError(
      'User not found',
      404
    );
  }

  if (
    String(user._id) ===
    String(req.user._id)
  ) {
    throw new AppError(
      'You cannot delete your own account.',
      400
    );
  }

  await Application.deleteMany({
    owner: user._id
  });

  await Campaign.deleteMany({
    owner: user._id
  });

  await Job.deleteMany({
    owner: user._id
  });

  await user.deleteOne();

  res.redirect(
    '/admin?msg=' +
      encodeURIComponent(
        'User and all their data were deleted'
      )
  );
});