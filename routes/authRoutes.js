const express = require('express');
const authController = require('../controllers/authController');

const router = express.Router();

// Route for user registration
router
  .route('/register')
  .post(authController.register); 

// Route for user login
router
  .route('/login')
  .post(authController.login); 

// Route for user homepage

module.exports = router;
