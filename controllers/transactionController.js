const {
  Transaction,
  validateTransaction,
} = require('../models/transactionModel');
const { User } = require('../models/userModel');

// Create transaction
exports.createTransaction = async (req, res) => {
  try {
    // Extract transaction details and user ID from the request body
    const { date, type, category, transactionAmount, title } = req.body;

    // Validate the transaction data
    const { error } = validateTransaction(req.body);
    if (error) {
      return res
        .status(400)
        .json({ status: 'fail', message: error.details[0].message });
    }

    // Find the user by ID
    const user = await User.findById(req.params.id);
    if (!user) {
      return res
        .status(404)
        .json({ status: 'fail', message: 'User not found' });
    }

    // Create a new transaction
    const newTransaction = new Transaction({
      date,
      type,
      category,
      transactionAmount,
      title,
    });

    // Add the transaction to the user's transactions array
    user.transactions.push(newTransaction);

    // Save the updated user document
    await user.save();

    // Send a success response with the updated user data
    res.status(201).json({
      status: 'success',
      data: {
        user,
      },
    });
  } catch (err) {
    // Handle any errors during the process
    res.status(500).json({
      status: 'error',
      message: 'An error occurred while creating the transaction',
    });
    console.log(err);
  }
};

// Get all transactions
exports.getAllTransactions = async (req, res) => {
  try {
    // Find the user by ID
    const user = await User.findById(req.params.id);

    // Check if the user exists
    if (!user) {
      return res.status(404).json({
        status: 'fail',
        message: 'User not found',
      });
    }

    // Retrieve all transactions for the user
    const transactions = user.transactions;

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

// Update transaction
exports.updateTransaction = async (req, res) => {
  // Implement the logic to update a transaction by ID
};

// Delete transaction
exports.deleteTransaction = async (req, res) => {
  // Implement the logic to delete a transaction by ID
};
