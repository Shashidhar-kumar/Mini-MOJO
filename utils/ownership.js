const mongoose = require('mongoose');
const AppError = require('./AppError');

// Admin sees everything,
// a recruiter only sees documents where owner = them
const ownerFilter = req =>
  req.user.role === 'admin'
    ? {}
    : { owner: req.user._id };

// Find one document by id,
// only if the user is allowed to see it.
async function findOwned(Model, req, id) {
  if (!mongoose.isValidObjectId(id)) {
    throw new AppError('Not found', 404);
  }

  const doc = await Model.findOne({
    _id: id,
    ...ownerFilter(req)
  });

  if (!doc) {
    throw new AppError(
      'Not found, or you do not have access to it.',
      404
    );
  }

  return doc;
}

module.exports = {
  ownerFilter,
  findOwned
};