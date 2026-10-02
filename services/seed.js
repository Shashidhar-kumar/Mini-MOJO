const User = require('../models/user');
const Platform = require('../models/platform');
const Application = require('../models/application');
const { round } = require('./optimizer');

// Sample numbers for a 2000 budget
// (scaled to the campaign's real budget)
const SAMPLE = [
  {
    name: 'LinkedIn',
    allocated: 600,
    spent: 500,
    apps: 10,
    qualifiedApps: 4
  },
  {
    name: 'Indeed',
    allocated: 500,
    spent: 450,
    apps: 45,
    qualifiedApps: 12
  },
  {
    name: 'ZipRecruiter',
    allocated: 500,
    spent: 300,
    apps: 15,
    qualifiedApps: 8
  },
  {
    name: 'Glassdoor',
    allocated: 400,
    spent: 200,
    apps: 4,
    qualifiedApps: 1
  }
];

const DEFAULT_PLATFORMS = [
  {
    name: 'LinkedIn',
    costModel: 'CPC',
    simulatedCPA: 50,
    qualityRate: 0.45
  },
  {
    name: 'Indeed',
    costModel: 'CPC',
    simulatedCPA: 10,
    qualityRate: 0.25
  },
  {
    name: 'ZipRecruiter',
    costModel: 'CPA',
    simulatedCPA: 20,
    qualityRate: 0.40
  },
  {
    name: 'Glassdoor',
    costModel: 'Flat',
    simulatedCPA: 45,
    qualityRate: 0.20
  }
];

// Creates the first admin from .env
// (only if no admin exists yet)
async function seedAdmin() {
  if (await User.findOne({ role: 'admin' })) {
    return;
  }

  const {
    ADMIN_NAME,
    ADMIN_EMAIL,
    ADMIN_PASSWORD
  } = process.env;

  if (!ADMIN_EMAIL || !ADMIN_PASSWORD) {
    console.log(
      'No admin created: set ADMIN_EMAIL and ADMIN_PASSWORD in .env'
    );
    return;
  }

  await User.create({
    name: ADMIN_NAME || 'Admin',
    email: ADMIN_EMAIL,
    password: ADMIN_PASSWORD,
    role: 'admin'
  });

  console.log(
    'Admin account created:',
    ADMIN_EMAIL
  );
}

async function seedPlatforms() {
  if (
    (await Platform.countDocuments()) === 0
  ) {
    await Platform.create(
      DEFAULT_PLATFORMS
    );
  }
}

// Replace a campaign's numbers with
// the sample data
async function loadSampleData(campaign) {
  const scale =
    campaign.totalBudget / 2000;

  const platforms =
    await Platform.find({
      name: {
        $in: SAMPLE.map(
          s => s.name
        )
      }
    });

  campaign.publishers =
    SAMPLE.map(s => {
      const p =
        platforms.find(
          x => x.name === s.name
        );

      const spent =
        round(s.spent * scale);

      return {
        name: s.name,
        platform:
          p ? p._id : undefined,
        allocated:
          round(
            s.allocated * scale
          ),
        spent,
        apps: s.apps,
        qualifiedApps:
          s.qualifiedApps,
        cpa:
          round(spent / s.apps)
      };
    });

  campaign.history = [];
  campaign.status = 'Active';

  // Counters were replaced,
  // so clear old records
  await Application.deleteMany({
    campaign: campaign._id
  });
}

module.exports = {
  seedAdmin,
  seedPlatforms,
  loadSampleData
};