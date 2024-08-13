const express = require('express');
const userController = require('../controllers/userController');

const router = express.Router();

// Route for creating a new user profile
router
  .route('/profile')
  .post(userController.createUserProfile); 

// Route for getting, updating, and deleting a specific user profile by ID
router
  .route('/:id/profile')
  .get(userController.getUserProfile) 
  .put(userController.updateUserProfile) 
  .delete(userController.deleteUserProfile); 

module.exports = router;
