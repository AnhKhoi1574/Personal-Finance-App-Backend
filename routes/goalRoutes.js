const express = require('express');
const goalController = require('../controllers/goalController');
const authController = require('../controllers/authController');

const router = express.Router();

// Routes for creating a new goal and getting all goals (protected)
router
  .route('/')
  .post(authController.protect, goalController.createGoal)
  .get(authController.protect, goalController.getAllGoals);

// Routes for getting, updating, and deleting a specific goal by ID (protected)
router
  .route('/:goalId')
  .get(authController.protect, goalController.getSpecificGoal)
  .put(authController.protect, goalController.updateGoal)
  .delete(authController.protect, goalController.deleteGoal);

module.exports = router;
