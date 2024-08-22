const express = require('express');
const userController = require('../controllers/userController');
const authController = require('../controllers/authController');

const router = express.Router();

// Protect all routes after this middleware
router.use(authController.protect);

// Route for getting, updating, and deleting the authenticated user's profile
router
  .route('/')
  .get(userController.getUserProfile)
  .put(userController.updateUserProfile)
  .delete(userController.deleteUserProfile);

module.exports = router;
