const Application = require('../models/application');
const { round } = require('./optimizer');

const FIRST = [
  'Aarav',
  'Diya',
  'Rohan',
  'Meera',
  'Kabir',
  'Ananya',
  'Ishaan',
  'Sara',
  'Vikram',
  'Neha',
  'Arjun',
  'Priya'
];

const LAST = [
  'Sharma',
  'Singh',
  'Mehta',
  'Gupta',
  'Kaur',
  'Verma',
  'Nair',
  'Reddy',
  'Khanna',
  'Bose'
];

const pick = list =>
  list[Math.floor(Math.random() * list.length)];

const isQualified = status =>
  ['Qualified', 'Hired'].includes(status);

// Keep the campaign's publisher counters
// in sync with Application records
function addToCounters(
  campaign,
  publisherName,
  status
) {
  const pub =
    campaign.publishers.find(
      p => p.name === publisherName
    );

  if (!pub) return;

  pub.apps += 1;

  if (isQualified(status)) {
    pub.qualifiedApps =
      (pub.qualifiedApps || 0) + 1;
  }

  pub.cpa =
    pub.apps > 0
      ? round(pub.spent / pub.apps)
      : 0;
}

function removeFromCounters(
  campaign,
  publisherName,
  status
) {
  const pub =
    campaign.publishers.find(
      p => p.name === publisherName
    );

  if (!pub) return;

  pub.apps =
    Math.max(0, pub.apps - 1);

  if (isQualified(status)) {
    pub.qualifiedApps =
      Math.max(
        0,
        (pub.qualifiedApps || 0) - 1
      );
  }

  pub.cpa =
    pub.apps > 0
      ? round(pub.spent / pub.apps)
      : 0;
}

function changeStatusCounters(
  campaign,
  publisherName,
  oldStatus,
  newStatus
) {
  const pub =
    campaign.publishers.find(
      p => p.name === publisherName
    );

  if (
    !pub ||
    isQualified(oldStatus) ===
      isQualified(newStatus)
  ) {
    return;
  }

  pub.qualifiedApps =
    Math.max(
      0,
      (pub.qualifiedApps || 0) +
        (isQualified(newStatus)
          ? 1
          : -1)
    );
}

// Turn the numbers produced by
// simulateDay() into real Application records
async function createSimulatedApplications(
  campaign,
  created
) {
  const docs = [];

  created.forEach(c => {
    for (let i = 0; i < c.apps; i++) {
      const first = pick(FIRST);
      const last = pick(LAST);

      docs.push({
        job: campaign.job,
        campaign: campaign._id,
        owner: campaign.owner,
        publisher: c.name,

        candidateName:
          `${first} ${last}`,

        email:
          `${first}.${last}${Math.floor(
            Math.random() * 900 + 100
          )}@example.com`.toLowerCase(),

        status:
          i < c.qualified
            ? 'Qualified'
            : pick([
                'New',
                'Screened',
                'Rejected'
              ])
      });
    }
  });

  if (docs.length) {
    await Application.insertMany(docs);
  }
}

module.exports = {
  isQualified,
  addToCounters,
  removeFromCounters,
  changeStatusCounters,
  createSimulatedApplications
};