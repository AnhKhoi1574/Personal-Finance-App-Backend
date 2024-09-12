const {
  Transaction,
  validateTransaction,
} = require('../models/transactionModel');
const { User } = require('../models/userModel');
const { createTransactionHelper } = require('../helpers/transactionHelper');

// Create transaction(with Automatic Savings)
exports.createTransaction = async (req, res) => {
  try {
    const userId = req.user._id;
    const { date, type, transactionAmount, category, title } = req.body;

    newTransaction = createTransactionHelper(userId, date, type, transactionAmount, category, title);
    // Respond with the newly created transaction
    res.status(201).json({
      status: 'success',
      message: 'Transaction created successfully',
      data: newTransaction,
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: 'An error occurred while creating the transaction',
      error: error.message,
    });
  }
};

// Get all transactions
exports.getAllTransactions = async (req, res) => {
  try {
    const { type, category, sort } = req.query; // Extracting query parameters
    const userId = req.user._id;

    // Build the filter object
    const filter = { _id: userId };

    if (type) {
      filter['transactions.type'] = type;
    }

    if (category) {
      filter['transactions.category'] = category;
    }

    // Find the user with the filtered transactions
    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({
        status: 'fail',
        message: 'User not found',
      });
    }

    let transactions = user.transactions;

    if (type || category || typeof isSavingsTransfer !== 'undefined') {
      transactions = transactions.filter((transaction) => {
        return (
          (!type || transaction.type === type) &&
          (!category || transaction.category === category) &&
          (typeof isSavingsTransfer === 'undefined' ||
            transaction.isSavingsTransfer === (isSavingsTransfer === 'true'))
        );
      });
    }

    // Apply sorting
    if (sort) {
      switch (sort) {
        case 'amount_asc':
          transactions.sort(
            (a, b) => a.transactionAmount - b.transactionAmount
          );
          break;
        case 'amount_desc':
          transactions.sort(
            (a, b) => b.transactionAmount - a.transactionAmount
          );
          break;
        case 'date_asc':
          transactions.sort((a, b) => new Date(a.date) - new Date(b.date));
          break;
        case 'date_desc':
          transactions.sort((a, b) => new Date(b.date) - new Date(a.date));
          break;
        default:
          break;
      }
    }

    // Send a success response with the transactions data
    res.status(200).json({
      status: 'success',
      data: {
        transactions,
      },
    });
  } catch (err) {
    // Handle any errors during the process
    res.status(500).json({
      status: 'error',
      message: 'An error occurred while retrieving transactions',
    });
  }
};

// Get a single transaction
exports.getTransaction = async (req, res) => {
  try {
    const userId = req.user._id;
    const transactionId = req.params.transactionId;

    // Find the user by ID
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        status: 'fail',
        message: 'User not found',
      });
    }

    // Find the transaction by ID within the user's transactions array
    const transaction = user.transactions.id(transactionId);
    if (!transaction) {
      return res.status(404).json({
        status: 'fail',
        message: 'Transaction not found',
      });
    }

    // Send a success response with the transaction details
    res.status(200).json({
      status: 'success',
      data: {
        transaction,
      },
    });
  } catch (err) {
    // Handle any errors during the process
    res.status(500).json({
      status: 'error',
      message: 'An error occurred while retrieving the transaction',
    });
  }
};

// Update transaction
exports.updateTransaction = async (req, res) => {
  try {
    const userId = req.user._id;
    const transactionId = req.params.transactionId;
    const { date, type, category, transactionAmount, title } = req.body;

    // Find the user by ID
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        status: 'fail',
        message: 'User not found',
      });
    }

    // Find the transaction by ID within the user's transactions array
    const transaction = user.transactions.id(transactionId);
    if (!transaction) {
      return res.status(404).json({
        status: 'fail',
        message: 'Transaction not found',
      });
    }

    // Reverse the effects of the existing transaction on balance and saving
    if (transaction.isSavingsTransfer) {
      if (transaction.type === 'income') {
        user.currentBalance -= transaction.transactionAmount;
        user.saving.currentAmount -= transaction.transactionAmount;
      } else {
        user.currentBalance += transaction.transactionAmount;
        user.saving.currentAmount -= transaction.transactionAmount;
      }
    } else {
      user.currentBalance +=
        transaction.type === 'income'
          ? -transaction.transactionAmount
          : transaction.transactionAmount;
    }

    // Update the transaction fields
    if (date) transaction.date = date;
    if (type) transaction.type = type;
    if (category) transaction.category = category;
    if (transactionAmount) transaction.transactionAmount = transactionAmount;
    if (title) transaction.title = title;

    // Apply the new transaction effects to balance and saving
    if (transaction.isSavingsTransfer) {
      if (transaction.type === 'income') {
        user.currentBalance += transaction.transactionAmount;
        user.saving.currentAmount += transaction.transactionAmount;
      } else {
        user.currentBalance -= transaction.transactionAmount;
        user.saving.currentAmount += transaction.transactionAmount;
      }
    } else {
      user.currentBalance +=
        transaction.type === 'income'
          ? transaction.transactionAmount
          : -transaction.transactionAmount;
    }

    // Save the updated user document
    await user.save();

    // Send a success response with the updated transaction data
    res.status(200).json({
      status: 'success',
      data: {
        transaction,
      },
    });
  } catch (err) {
    // Handle any errors during the process
    res.status(500).json({
      status: 'error',
      message: 'An error occurred while updating the transaction',
    });
  }
};

// Delete transaction
exports.deleteTransaction = async (req, res) => {
  try {
    // Extract user ID and transaction ID from the request parameters
    const { transactionId } = req.params;

    // Find the user by ID
    const user = await User.findById(req.user._id);
    if (!user) {
      return res
        .status(404)
        .json({ status: 'fail', message: 'User not found' });
    }

    // Find the transaction in the user's transactions array
    const transactionIndex = user.transactions.findIndex(
      (transaction) => transaction._id.toString() === transactionId
    );

    if (transactionIndex === -1) {
      return res
        .status(404)
        .json({ status: 'fail', message: 'Transaction not found' });
    }

    // Get the transaction to be deleted
    const transactionToDelete = user.transactions[transactionIndex];

    // Adjust the current balance and saving amount based on the transaction type and whether it's a savings transfer
    if (transactionToDelete.isSavingsTransfer) {
      if (transactionToDelete.type === 'income') {
        // Undo an income transfer from savings to current balance
        user.currentBalance -= transactionToDelete.transactionAmount;
        user.saving.currentAmount += transactionToDelete.transactionAmount;
      } else if (transactionToDelete.type === 'expense') {
        // Undo an expense transfer from current balance to savings
        user.currentBalance += transactionToDelete.transactionAmount;
        user.saving.currentAmount -= transactionToDelete.transactionAmount;
      }
    } else {
      if (transactionToDelete.type === 'income') {
        // Undo an income transaction (add back the amount to current balance)
        user.currentBalance -= transactionToDelete.transactionAmount;
      } else if (transactionToDelete.type === 'expense') {
        // Undo an expense transaction (subtract the amount from current balance)
        user.currentBalance += transactionToDelete.transactionAmount;
      }
    }

    // Remove the transaction from the user's transactions array
    user.transactions.splice(transactionIndex, 1);

    // Save the updated user document
    await user.save();

    // Send a success response
    res.status(200).json({
      status: 'success',
      message: 'Transaction deleted successfully',
    });
  } catch (err) {
    // Handle any errors during the process
    res.status(500).json({
      status: 'error',
      message: 'An error occurred while deleting the transaction',
    });
  }
};
