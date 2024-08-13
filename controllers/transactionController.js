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
        newTransaction,
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

// Get a single transaction
exports.getTransaction = async (req, res) => {
  try {
    const userId = req.params.id;
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
    const userId = req.params.id;
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

    // Update the transaction fields
    if (date) transaction.date = date;
    if (type) transaction.type = type;
    if (category) transaction.category = category;
    if (transactionAmount) transaction.transactionAmount = transactionAmount;
    if (title) transaction.title = title;

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
    const { id, transactionId } = req.params;

    // Find the user by ID
    const user = await User.findById(id);
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

    // Remove the transaction from the user's transactions array
    user.transactions.splice(transactionIndex, 1);

    // Save the updated user document
    await user.save();

    // Send a success response
    res.status(204).json({
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
