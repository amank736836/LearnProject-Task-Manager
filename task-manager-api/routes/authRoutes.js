const express = require('express');
const router = express.Router();
const { registerUser, loginUser, getMe } = require('../controllers/authController');
const { protect } = require('../middleware/authMiddleware');
const { apiLimiter, authLimiter } = require('../middleware/rateLimiters');

router.post('/register', authLimiter, registerUser);
router.post('/login', authLimiter, loginUser);
router.get('/me', apiLimiter, protect, getMe);

module.exports = router;
