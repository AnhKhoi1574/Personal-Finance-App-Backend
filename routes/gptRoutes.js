const express = require('express');
const router = express.Router();
const conversationController = require('../controllers/gptController');
const authController = require('../controllers/authController');

// Main chat
router.get(
  '/conversations',
  authController.protect,
  conversationController.getAllConversations
);

router
  .route('/conversations/:conversationId')
  .get(authController.protect, conversationController.getConversationMessages)
  .put(
    authController.protect,
    conversationController.updateConversationSettings
  )
  .delete(authController.protect, conversationController.deleteConversation);

router.post(
  '/generate',
  authController.protect,
  conversationController.sendMainMessage
);

module.exports = router;
