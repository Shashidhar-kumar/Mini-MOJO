const { validationResult } = require('express-validator');

exports.getErrors = req =>
    validationResult(req)
        .array()
        .map(e => e.msg);