const express = require('express');
const transactionController = require('../controllers/transactionController');
const authController = require('../controllers/authController');

const router = express.Router();

// Route for creating a new transaction and getting all transactions
router
  .route('/')
  .post(authController.protect, transactionController.createTransaction)
  .get(authController.protect, transactionController.getAllTransactions);
  
router 
  .route('/getChartData')
  .get(authController.protect, transactionController.getChartData);
  
// Route for getting, updating and deleting a specific transaction by ID
router
  .route('/:transactionId')
  .get(authController.protect, transactionController.getTransaction)
  .put(authController.protect, transactionController.updateTransaction)
  .delete(authController.protect, transactionController.deleteTransaction);

module.exports = router;
