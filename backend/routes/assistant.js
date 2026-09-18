const express = require('express');
const router = express.Router();
const assistantController = require('../controllers/assistantController');
const authenticateToken = require('../middleware/auth');

router.use(authenticateToken);

router.post('/chat', assistantController.chat);
router.get('/history', assistantController.getChatHistory);

module.exports = router;
