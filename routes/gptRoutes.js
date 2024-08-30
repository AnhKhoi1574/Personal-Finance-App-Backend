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
  .put(authController.protect, conversationController.updateConversationSettings)
  .delete(authController.protect, conversationController.deleteConversation);

router.post(
  '/generate',
  authController.protect,
  conversationController.sendMainMessage
);

// Generate an array of 4 prompts
router.post(
  '/getPrompts',
  authController.protect,
  conversationController.getSuggestionPrompt
);

// Small chat
router
  .route('/small')
  .get(authController.protect, conversationController.getSmallMessages)
  .delete(
    authController.protect,
    conversationController.deleteSmallConversation
  );

router.post(
  '/small/generate',
  authController.protect,
  conversationController.sendSmallMessage
);

router.post(
  '/small/transit',
  authController.protect,
  conversationController.transitSmallConversation
);

module.exports = router;
