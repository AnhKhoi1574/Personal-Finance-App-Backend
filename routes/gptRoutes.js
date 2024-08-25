const express = require('express');
const router = express.Router();
const conversationController = require('../controllers/gptController');

// Existing routes
router.get(
  '/:userId/conversations',
  conversationController.getAllConversations
);
router.get(
  '/:userId/conversations/:conversationId',
  conversationController.getConversation
);
router.post(
  '/:userId/conversations',
  conversationController.createConversation
);
router.post(
  '/:userId/conversations/:conversationId/messages',
  conversationController.addMessage
);

// New route for sending message to GPT
router.post('/:userId/sendMessage', conversationController.sendMessageToGpt);

module.exports = router;
