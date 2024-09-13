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
router.get(
  '/conversations/:conversationId',
  authController.protect,
  conversationController.getConversationMessages
);

router.post(
  '/sendMessages',
  authController.protect,
  conversationController.sendMessageToGpt
);

// The 3 below routes are for small chat dialogs appear on each pages
router.post(
  '/suggestion/getPrompts',
  authController.protect,
  conversationController.getSuggestionPrompt
);
module.exports = router;

router.post(
  '/suggestion/sendMessage',
  authController.protect,
  conversationController.sendSuggestionMessage
);

router.post(
  '/suggestion/transition',
  authController.protect,
  conversationController.transitionSuggestionPrompt
)

router.delete(
  '/suggestion/delete',
  authController.protect,
  conversationController.deleteSuggestionPrompt
)

router.post(
  '/test',
  authController.protect,
  conversationController.test
)