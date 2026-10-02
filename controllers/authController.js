const jwt = require('jsonwebtoken');
const User = require('../models/user');
const catchAsync = require('../utils/catchAsync');
const { getErrors } = require('../utils/validate');

const homeFor = user => (user.role === 'admin' ? '/admin' : '/dashboard');

// Create a JWT and store it in an httpOnly cookie (JavaScript in the browser cannot read it)
function sendToken(res, user) {
  const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || '7d'
  });

  res.cookie('token', token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    maxAge: 7 * 24 * 60 * 60 * 1000
  });
}

exports.homeFor = homeFor;

exports.showRegister = (req, res) => {
  if (req.user) return res.redirect(homeFor(req.user));
  res.render('auth/register', { pageTitle: 'Register' });
};

exports.register = catchAsync(async (req, res) => {
  const errors = getErrors(req);

  if (!errors.length && (await User.findOne({ email: req.body.email }))) {
    errors.push('That email is already registered');
  }

  if (errors.length) {
    return res.status(400).render('auth/register', {
      pageTitle: 'Register',
      errors,
      values: req.body
    });
  }

  // role is NOT taken from the form: everyone who registers is a recruiter
  const user = await User.create({
    name: req.body.name,
    email: req.body.email,
    password: req.body.password
  });

  sendToken(res, user);

  res.redirect('/dashboard?msg=' + encodeURIComponent('Welcome to Mini-MOJO!'));
});

exports.showLogin = (req, res) => {
  if (req.user) return res.redirect(homeFor(req.user));
  res.render('auth/login', { pageTitle: 'Log in' });
};

exports.login = catchAsync(async (req, res) => {
  const errors = getErrors(req);

  if (errors.length) {
    return res.status(400).render('auth/login', {
      pageTitle: 'Log in',
      errors,
      values: req.body
    });
  }

  const user = await User.findOne({ email: req.body.email }).select('+password');

  if (!user || !(await user.matchPassword(req.body.password))) {
    return res.status(401).render('auth/login', {
      pageTitle: 'Log in',
      errors: ['Invalid email or password'],
      values: { email: req.body.email }
    });
  }

  sendToken(res, user);
  res.redirect(homeFor(user));
});

exports.logout = (req, res) => {
  res.clearCookie('token');
  res.redirect('/login?msg=' + encodeURIComponent('You have been logged out'));
};