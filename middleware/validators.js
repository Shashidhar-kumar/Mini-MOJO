const { body } = require('express-validator');

exports.registerRules = [
  body('name').trim().notEmpty().withMessage('Name is required'),
  body('email').trim().toLowerCase().isEmail().withMessage('Enter a valid email'),
  body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
  body('confirmPassword').custom((v, { req }) => v === req.body.password).withMessage('Passwords do not match')
];

exports.loginRules = [
  body('email').trim().toLowerCase().isEmail().withMessage('Enter a valid email'),
  body('password').notEmpty().withMessage('Password is required')
];

exports.jobRules = [
  body('title').trim().notEmpty().withMessage('Job title is required'),
  body('company').trim().notEmpty().withMessage('Company is required'),
  body('status').isIn(['Open', 'Closed']).withMessage('Status must be Open or Closed')
];

exports.platformRules = [
  body('name').trim().notEmpty().withMessage('Platform name is required'),
  body('costModel').isIn(['CPC', 'CPA', 'Flat']).withMessage('Choose a cost model'),
  body('simulatedCPA').isFloat({ gt: 0 }).withMessage('Simulated CPA must be more than 0'),
  body('qualityRate').isFloat({ min: 0, max: 1 }).withMessage('Quality rate must be between 0 and 1')
];

exports.campaignCreateRules = [
  body('title').trim().notEmpty().withMessage('Campaign title is required'),
  body('job').custom((value, { req }) => {
    const hasJob = /^[0-9a-fA-F]{24}$/.test(value || '');
    const hasNewJob = (req.body.newJobTitle || '').trim() !== '' && (req.body.newJobCompany || '').trim() !== '';
    return Boolean(hasJob || hasNewJob);
  }).withMessage('Choose a job, or fill in a new job title and company'),
  body('totalBudget').isFloat({ gt: 0 }).withMessage('Budget must be more than 0'),
  body('platforms').custom(v => v && v.length > 0).withMessage('Choose at least one platform')
];

exports.campaignEditRules = [
  body('title').trim().notEmpty().withMessage('Campaign title is required'),
  body('status').isIn(['Active', 'Optimized', 'Paused', 'Completed']).withMessage('Invalid status')
];

exports.applicationCreateRules = [
  body('publisher').trim().notEmpty().withMessage('Choose a platform'),
  body('candidateName').trim().notEmpty().withMessage('Candidate name is required'),
  body('email').trim().toLowerCase().isEmail().withMessage('Enter a valid candidate email'),
  body('status').isIn(['New', 'Screened', 'Qualified', 'Rejected', 'Hired']).withMessage('Invalid status')
];

exports.applicationEditRules = [
  body('candidateName').trim().notEmpty().withMessage('Candidate name is required'),
  body('email').trim().toLowerCase().isEmail().withMessage('Enter a valid candidate email'),
  body('status').isIn(['New', 'Screened', 'Qualified', 'Rejected', 'Hired']).withMessage('Invalid status')
];