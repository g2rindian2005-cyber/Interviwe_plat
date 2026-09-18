const express = require('express');
const router = express.Router();
const interviewController = require('../controllers/interviewController');
const authenticateToken = require('../middleware/auth');

router.use(authenticateToken);

router.get('/technologies', interviewController.getTechnologies);
router.post('/start', interviewController.startInterview);
router.post('/answer', interviewController.submitAnswer);
router.get('/report/:interviewId', interviewController.getReport);
router.get('/history', interviewController.getHistory);

module.exports = router;
