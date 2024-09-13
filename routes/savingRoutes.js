const express = require('express');
const savingController = require('../controllers/savingController');
const authController = require('../controllers/authController');

const router = express.Router();

// Route for creating, getting, updating, and deleting a saving
router
  .route('/')
  .get(authController.protect, savingController.getSaving)
  .post(authController.protect, savingController.createSaving)
  .put(authController.protect, savingController.updateSaving)
  .delete(authController.protect, savingController.deleteSaving);

// Route to add money to saving
router
  .route('/add-money')
  .post(authController.protect, savingController.addMoneyToSaving);

// Route to withdraw money from saving
router
  .route('/withdraw-money')
  .post(authController.protect, savingController.withdrawFromSaving);

// Route to toggle automatic saving feature
router
  .route('/toggle-automatic')
  .patch(authController.protect, savingController.toggleAutomaticSaving);

module.exports = router;
