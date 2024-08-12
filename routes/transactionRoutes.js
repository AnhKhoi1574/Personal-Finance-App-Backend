const express = require('express');
const transactionController = require('../controllers/transactionController');

const router = express.Router();

// Route for creating a new transaction and getting all transactions
router
  .route('/:id/transactions')
  .post(transactionController.createTransaction)
  .get(transactionController.getAllTransactions);

// Route for updating and deleting a specific transaction by ID
router
  .route('/:id/transactions/:transactionId')
  .put(transactionController.updateTransaction)
  .delete(transactionController.deleteTransaction);

module.exports = router;
