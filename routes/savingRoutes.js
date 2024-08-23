const express = require('express');
const savingController = require('../controllers/savingController');

const router = express.Router();

// Route for creating a new saving and getting all savings
router
  .route('/')
  .post(savingController.createsaving)
  .get(savingController.getAllsavings);

// Route for getting, updating, and deleting a specific saving by ID
router
  .route('/:id')
  .get(savingController.getSpecificSaving)
  .put(savingController.updateSaving)
  .delete(savingController.deleteSaving);

module.exports = router;
