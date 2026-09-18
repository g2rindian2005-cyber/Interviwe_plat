const express = require('express');
const router = express.Router();
const quizController = require('../controllers/quizController');
const authenticateToken = require('../middleware/auth');

router.use(authenticateToken);

router.get('/:technology', quizController.getQuiz);
router.post('/submit', quizController.submitQuiz);

module.exports = router;
