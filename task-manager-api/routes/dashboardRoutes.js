const express = require('express');
const router = express.Router();
const { getDashboardAnalytics } = require('../controllers/dashboardController');
const { protect } = require('../middleware/authMiddleware');
const { apiLimiter } = require('../middleware/rateLimiters');

router.get('/', apiLimiter, protect, getDashboardAnalytics);

module.exports = router;
