const {
  Transaction,
  validateTransaction,
} = require('../models/transactionModel');
const { User } = require('../models/userModel');
const { createTransactionHelper, updateTransactionHelper } = require('../helpers/transactionHelper');

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

// Update transaction (with Budget Integration)
exports.updateTransaction = async (req, res) => {
  try {
    const userId = req.user._id;
    const transactionId = req.params.transactionId;
    const { date, type, category, transactionAmount, title } = req.body;

    const updatedTransaction = await updateTransactionHelper(
      userId,
      transactionId,
      date,
      type,
      category,
      transactionAmount,
      title
    );

    // Send a success response with the updated transaction data
    res.status(200).json({
      status: 'success',
      data: {
        updatedTransaction,
      },
    });
  } catch (err) {
    res.status(500).json({
      status: 'error',
      message: 'An error occurred while updating the transaction',
    });
  }
};

// Delete transaction (with Budget Integration)
exports.deleteTransaction = async (req, res) => {
  try {
    // Extract user ID and transaction ID from the request parameters
    const { transactionId } = req.params;

    // Find the user by ID
    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(404).json({
        status: 'fail',
        message: 'User not found',
      });
    }

    // Find the transaction in the user's transactions array
    const transaction = user.transactions.id(transactionId);
    if (!transaction) {
      return res.status(404).json({
        status: 'fail',
        message: 'Transaction not found',
      });
    }

    // Prevent direct deletion of saving transactions
    if (transaction.isSavingsTransfer) {
      return res.status(403).json({
        status: 'fail',
        message: 'Saving transactions cannot be deleted directly',
      });
    }

    // If this is an income transaction, check if there is a corresponding saving transaction
    if (transaction.type === 'income') {
      // Find the index of the associated saving transaction
      const savingTransactionIndex = user.transactions.findIndex(
        (t) =>
          t.isSavingsTransfer && t.date.getTime() === transaction.date.getTime()
      );

      if (savingTransactionIndex !== -1) {
        // Remove the corresponding saving transaction using splice
        user.transactions.splice(savingTransactionIndex, 1);
      }

      // Adjust the current balance (subtract income)
      user.currentBalance -= transaction.transactionAmount;
    } else if (transaction.type === 'expense') {
      // Adjust the current balance (add back expense)
      user.currentBalance += transaction.transactionAmount;

      // Adjust the budget if necessary
      if (user.budget && user.budget.categories[transaction.category]) {
        user.budget.categories[transaction.category].spent -=
          transaction.transactionAmount;
      }
    }

    // Remove the main transaction from the user's transactions array using splice
    user.transactions.pull({ _id: transactionId });

    // Save the updated user document
    await user.save();

    // Send a success response
    res.status(200).json({
      status: 'success',
      message: 'Transaction deleted successfully',
    });
  } catch (err) {
    res.status(500).json({
      status: 'error',
      message: 'An error occurred while deleting the transaction',
      error: err.message,
    });
  }
};

// Get chart data for all transactions of a specific year
exports.getChartData = async (req, res) => {
  try {
    const userId = req.user._id;
    const { year } = req.query; // Get the year from the request query

    if (!year) {
      return res.status(400).json({
        status: 'fail',
        message: 'Please provide a year in the request query',
      });
    }

    // Convert the year to a number to ensure it's valid
    const targetYear = parseInt(year);
    if (isNaN(targetYear)) {
      return res.status(400).json({
        status: 'fail',
        message: 'Invalid year format',
      });
    }

    // Find the user and get their transactions
    const user = await User.findById(userId).select('transactions');
    if (!user) {
      return res
        .status(404)
        .json({ status: 'fail', message: 'User not found' });
    }

    const transactions = user.transactions;

    // Sort transactions by date
    transactions.sort((a, b) => new Date(a.date) - new Date(b.date));

    // Initialize a map to store data by month
    const dataMap = new Map();
    const monthNames = [
      'January',
      'February',
      'March',
      'April',
      'May',
      'June',
      'July',
      'August',
      'September',
      'October',
      'November',
      'December',
    ];

    // Loop through each transaction, filtering by the target year
    transactions.forEach((transaction) => {
      const date = new Date(transaction.date);
      const transactionYear = date.getFullYear();
      const month = date.getMonth(); // 0-11 for months in JavaScript

      if (transactionYear === targetYear) {
        const key = `${month}`;

        if (!dataMap.has(key)) {
          dataMap.set(key, { month: monthNames[month], income: 0, expense: 0 });
        }

        const dataEntry = dataMap.get(key);

        if (transaction.type === 'income') {
          dataEntry.income += transaction.transactionAmount;
        } else if (transaction.type === 'expense') {
          dataEntry.expense += transaction.transactionAmount;
        }
      }
    });

    // Initialize an array to hold the final data for all months
    const filledData = [];

    // Ensure that all 12 months are included, even if there are no transactions
    for (let month = 0; month < 12; month++) {
      const key = `${month}`;

      if (dataMap.has(key)) {
        filledData.push(dataMap.get(key));
      } else {
        filledData.push({ month: monthNames[month], income: 0, expense: 0 });
      }
    }

    // Respond with the data for the requested year
    res.status(200).json({
      status: 'success',
      data: filledData,
    });
  } catch (err) {
    res.status(500).json({
      status: 'error',
      message: 'An error occurred while fetching chart data',
      error: err.message,
    });
  }
};

// Get all years that have transactions (income or expense) for the user
exports.getTransactionYear = async (req, res) => {
  try {
    const userId = req.user._id;

    // Find the user and get their transactions
    const user = await User.findById(userId).select('transactions');
    if (!user) {
      return res
        .status(404)
        .json({ status: 'fail', message: 'User not found' });
    }

    const transactions = user.transactions;

    // Initialize a set to store unique years
    const yearsSet = new Set();

    // Loop through each transaction and extract the year
    transactions.forEach((transaction) => {
      const transactionYear = new Date(transaction.date).getFullYear();
      yearsSet.add(transactionYear);
    });

    // Convert the set to an array and sort the years in ascending order
    const yearsArray = Array.from(yearsSet).sort((a, b) => a - b);

    // Respond with the years array
    res.status(200).json({
      status: 'success',
      data: yearsArray,
    });
  } catch (err) {
    res.status(500).json({
      status: 'error',
      message: 'An error occurred while fetching transaction years',
      error: err.message,
    });
  }
};
