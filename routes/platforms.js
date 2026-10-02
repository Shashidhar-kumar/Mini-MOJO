const express = require('express');
const platforms = require('../controllers/platformController');
const { protect, restrictTo } = require('../middleware/auth');
const { platformRules } = require('../middleware/validators');

const router = express.Router();

router.use(protect);

router.get('/', platforms.index);                       // everyone can view

// only admins can create / edit / delete
router.get('/new', restrictTo('admin'), platforms.showNew);
router.post('/', restrictTo('admin'), platformRules, platforms.create);

router.get('/:id/edit', restrictTo('admin'), platforms.showEdit);
router.post('/:id/edit', restrictTo('admin'), platformRules, platforms.update);

router.post('/:id/delete', restrictTo('admin'), platforms.remove);

module.exports = router;