require('dotenv').config();

const express = require('express');
const path = require('path');
const cookieParser = require('cookie-parser');

const connectDB = require('./config/db');
const { attachUser } = require('./middleware/auth');
const { seedAdmin, seedPlatforms } = require('./services/seed');

if (!process.env.JWT_SECRET) {
  console.error(
    'Missing JWT_SECRET in .env. Copy .env.example to .env and set it.'
  );
  process.exit(1);
}

const app = express();

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

// Values every view can use
app.use((req, res, next) => {
  res.locals.errors = [];
  res.locals.values = {};
  res.locals.msg = req.query.msg
    ? String(req.query.msg).slice(0, 120)
    : null;

  res.locals.money = n =>
    '$' +
    Number(n || 0).toLocaleString('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    });

  next();
});

app.use(attachUser); // sets req.user and res.locals.user from the cookie

// ---------- ROUTES ----------

app.use('/', require('./routes/auth'));

app.use('/jobs', require('./routes/jobs'));

app.use('/campaigns', require('./routes/campaigns'));

app.use('/platforms', require('./routes/platforms'));

app.use('/applications', require('./routes/applications'));

app.use('/api', require('./routes/api'));

app.use('/', require('./routes/pages'));

// ---------- 404 ----------

app.use((req, res, next) => {
  const err = new Error('Page not found');
  err.status = 404;
  next(err);
});

// ---------- CENTRAL ERROR HANDLER ----------

app.use((err, req, res, next) => {
  let status = err.status || 500;
  let message = err.message;

  if (err.name === 'ValidationError') {
    status = 400;
    message = Object.values(err.errors)
      .map(e => e.message)
      .join(', ');
  }

  if (err.name === 'CastError') {
    status = 404;
    message = 'Not found';
  }

  if (err.code === 11000) {
    status = 400;
    message = 'That value already exists';
  }

  if (status === 500) {
    console.error(err);
    message = 'Something went wrong on our side.';
  }

  if (req.originalUrl.startsWith('/api')) {
    return res.status(status).json({
      error: message
    });
  }

  res.locals.user = res.locals.user || null;

  res.status(status).render('error', {
    pageTitle: 'Error',
    status,
    message
  });
});

// ---------- START SERVER ----------

const PORT = process.env.PORT || 5000;

connectDB().then(async () => {
  await seedAdmin();
  await seedPlatforms();

  app.listen(PORT, () =>
    console.log(
      `Mini-MOJO running at http://localhost:${PORT}`
    )
  );
});