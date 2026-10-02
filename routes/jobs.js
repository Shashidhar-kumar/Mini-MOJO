const express = require('express');
const auth = require('../controllers/authController');
const { registerRules, loginRules } = require('../middleware/validators');

const router = express.Router();

router.get('/register', auth.showRegister);
router.post('/register', registerRules, auth.register);

router.get('/login', auth.showLogin);
router.post('/login', loginRules, auth.login);

router.post('/logout', auth.logout);

module.exports = router;