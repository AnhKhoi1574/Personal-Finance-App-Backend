const express = require('express');
const savingController = require('../controllers/savingController');
const authController = require('../controllers/authController');

const router = express.Router();

// Route for creating a new saving and getting all savings
router
  .route('/')
  .post(authController.protect, savingController.createSaving)
  .get(authController.protect, savingController.getAllSavings);

// Route for getting, updating, and deleting a specific saving by ID
router
  .route('/:savingId')
  .get(authController.protect, savingController.getSpecificSaving)
  .put(authController.protect, savingController.updateSaving)
  .delete(authController.protect, savingController.deleteSaving);

module.exports = router;
