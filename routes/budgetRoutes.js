const express = require('express');
const budgetController = require('../controllers/budgetController');

const router = express.Router();

// Route for creating a new budget and getting all budgets
router 
    .route('/budget')
    .post(budgetController.createBudget) 
    .get(budgetController.getAllBudgets); 

// Route for getting, updating, and deleting a specific budget by ID
router
    .route('/budget/:id')
    .get(budgetController.getSpecificBudget) 
    .put(budgetController.updateBudget) 
    .delete(budgetController.deleteBudget); 

module.exports = router;
