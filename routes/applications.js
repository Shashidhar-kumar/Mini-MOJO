const express = require('express');
const applications = require('../controllers/applicationController');
const { protect } = require('../middleware/auth');
const {
  applicationCreateRules,
  applicationEditRules
} = require('../middleware/validators');

const router = express.Router();

router.use(protect);

router.get('/', applications.index);
router.get('/new', applications.showNew);
router.post('/', applicationCreateRules, applications.create);

router.get('/:id/edit', applications.showEdit);
router.post('/:id/edit', applicationEditRules, applications.update);

router.post('/:id/delete', applications.remove);

module.exports = router;