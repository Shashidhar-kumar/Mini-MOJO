const jwt = require('jsonwebtoken');
const User = require('../models/user');
const AppError = require('../utils/AppError');

// Runs on every request: if the cookie holds a valid token, load the user
exports.attachUser = async (req, res, next) => {
  req.user = null;
  res.locals.user = null;

  const token = req.cookies.token;

  if (!token) return next();

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.id);

    if (user) {
      req.user = user;
      res.locals.user = user;
    } else {
      res.clearCookie('token');
    }
  } catch (err) {
    res.clearCookie('token'); // expired or tampered token
  }

  next();
};

// Login required
exports.protect = (req, res, next) => {
  if (req.user) return next();

  if (req.originalUrl.startsWith('/api')) {
    return res.status(401).json({
      error: 'Please log in first.'
    });
  }

  res.redirect('/login');
};

// Role required, e.g. restrictTo('admin')
exports.restrictTo = (...roles) => (req, res, next) => {
  if (!roles.includes(req.user.role)) {
    return next(
      new AppError(
        'You do not have permission to do that.',
        403
      )
    );
  }

  next();
};