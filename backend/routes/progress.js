const express = require('express');
const router = express.Router();
const progressController = require('../controllers/progressController');
const authenticateToken = require('../middleware/auth');

router.use(authenticateToken);

router.get('/', progressController.getProgress);
router.post('/complete-topic', progressController.markTopicComplete);

module.exports = router;
