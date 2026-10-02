module.exports = obj =>
    JSON.stringify(obj).replace(/</g, '\\u003c');
