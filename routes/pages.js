const express = require('express');
const dashboard = require('../controllers/dashboardController');
const admin = require('../controllers/adminController');
const { homeFor } = require('../controllers/authController');
const { protect, restrictTo } = require('../middleware/auth');

const router = express.Router();

// Home: send people where they belong
router.get('/', (req, res) =>
  res.redirect(req.user ? homeFor(req.user) : '/login')
);

router.get('/dashboard', protect, dashboard.recruiter);
router.get('/analytics', protect, dashboard.analyticsPage);

// Admin only
router.get('/admin', protect, restrictTo('admin'), admin.dashboard);

router.post(
  '/admin/users/:id/role',
  protect,
  restrictTo('admin'),
  admin.toggleRole
);

router.post(
  '/admin/users/:id/delete',
  protect,
  restrictTo('admin'),
  admin.deleteUser
);

module.exports = router;