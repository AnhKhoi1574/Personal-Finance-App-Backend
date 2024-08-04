const express = require('express');
const goalController = require('../controllers/goalController');

const router = express.Router();

// Route for creating a new goal and getting all goals
router
  .route('/goal')
  .post(goalController.createGoal)
  .get(goalController.getAllGoals); 

// Route for getting, updating, and deleting a specific goal by ID
router
  .route('/goal/:id')
  .get(goalController.getSpecificGoal) 
  .put(goalController.updateGoal) 
  .delete(goalController.deleteGoal); 

module.exports = router;
