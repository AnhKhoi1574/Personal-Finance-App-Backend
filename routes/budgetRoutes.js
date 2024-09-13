const express = require('express');
const budgetController = require('../controllers/budgetController');
const authController = require('../controllers/authController');

const router = express.Router();

// Route for creating a new budget, getting all budgets, updating, and deleting
router
  .route('/')
  .post(authController.protect, budgetController.createBudget)
  .get(authController.protect, budgetController.getBudget)
  .patch(authController.protect, budgetController.updateBudget)
  .delete(authController.protect, budgetController.deleteBudget);

module.exports = router;
