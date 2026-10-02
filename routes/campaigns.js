const express = require('express');
const campaigns = require('../controllers/campaignController');
const { protect } = require('../middleware/auth');
const {
  campaignCreateRules,
  campaignEditRules
} = require('../middleware/validators');

const router = express.Router();

router.use(protect);

router.get('/', campaigns.index);
router.get('/new', campaigns.showNew);
router.post('/', campaignCreateRules, campaigns.create);

router.get('/:id', campaigns.show);
router.get('/:id/edit', campaigns.showEdit);
router.post('/:id/edit', campaignEditRules, campaigns.update);
router.post('/:id/delete', campaigns.remove);

router.get('/:id/recommendation', campaigns.showRecommendation);
router.post('/:id/recommendation/apply', campaigns.applyRecommendation);

module.exports = router;