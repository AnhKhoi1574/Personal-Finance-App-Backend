const express = require('express');
const userController = require('../controllers/userController');
const authController = require('../controllers/authController');

const router = express.Router();

// Protect all routes after this middleware
router.use(authController.protect);

// Route for creating a new user profile (Only authenticated users can create a profile)
router
  .route('/')
  .post(userController.createUserProfile);

// Route for getting, updating, and deleting the authenticated user's profile
router
  .route('/profile')
  .get(userController.getUserProfile)
  .put(userController.updateUserProfile)
  .delete(userController.deleteUserProfile);

module.exports = router;
