const {
  Transaction,
  validateTransaction,
} = require('../models/transactionModel');
const { User } = require('../models/userModel');

// Create transaction (with Automatic Savings and Budget Integration)
exports.createTransaction = async (req, res) => {
  try {
    const userId = req.user._id;
    const { date, type, transactionAmount, category, title } = req.body;

    // Validate input with Joi
    const { error } = validateTransaction({
      date: new Date(),
      type,
      category,
      transactionAmount,
      title,
    });
    if (error) {
      return res.status(400).json({
        status: 'error',
        message: error.details[0].message,
      });
    }

    // Find the user by ID and populate saving and budget data
    const user = await User.findById(userId).populate('saving');
    if (!user) {
      return res.status(404).json({ status: 'error', message: 'User not found' });
    }

    let actualTransactionAmount = transactionAmount;
    let savingAmount = 0;

    // Handle automatic savings if the transaction is of type 'income'
    if (
      type === 'income' &&
      user.saving &&
      user.saving.isAutoSavingEnabled &&
      user.saving.autoSavingPercentage > 0
    ) {
      savingAmount = (transactionAmount * user.saving.autoSavingPercentage) / 100;

      // Calculate potential new saving amount
      const potentialNewSavingAmount = user.saving.currentAmount + savingAmount;

      // If the potential new saving amount exceeds the target amount, adjust the saving amount
      if (potentialNewSavingAmount > user.saving.targetAmount) {
        const allowableSavingAmount = user.saving.targetAmount - user.saving.currentAmount;
        user.saving.currentAmount += allowableSavingAmount;
        actualTransactionAmount -= allowableSavingAmount;
        savingAmount = allowableSavingAmount; // Update savingAmount to reflect the actual amount added
      } else {
        user.saving.currentAmount += savingAmount;
        actualTransactionAmount -= savingAmount;
      }

      // Create a corresponding savings transaction with the same date as the income transaction
      const savingTransaction = new Transaction({
        date, // Set the same date as the user-entered income transaction
        type: 'expense',
        category: 'saving',
        transactionAmount: savingAmount, // Use the adjusted savingAmount
        title: 'Saving from income',
        isSavingsTransfer: true,
      });

      // Add the savings transaction to the user's transactions
      user.transactions.push(savingTransaction);

      // Adjust the budget if the budget exists and the category is 'saving'
      if (user.budget && user.budget.categories.saving) {
        user.budget.categories.saving.spent += savingAmount;
      }
    }

    // Create the main transaction
    const newTransaction = new Transaction({
      date, // Use the user-provided date for the income transaction
      type,
      category,
      transactionAmount: actualTransactionAmount, // Save the actual amount after savings cut-off
      title,
      isSavingsTransfer: false,
    });

    // Add the new transaction to the user's transactions
    user.transactions.push(newTransaction);

    // Update the user's current balance
    user.currentBalance += type === 'income' ? actualTransactionAmount : -transactionAmount;

    // Adjust the budget if it's an expense transaction and falls within the current budget period
    if (
      type === 'expense' && 
      user.budget &&
      new Date(date) >= new Date(user.budget.startDate) && 
      new Date(date) <= new Date(user.budget.deadline) &&
      user.budget.categories[category]
    ) {
      user.budget.categories[category].spent += actualTransactionAmount;
    }

    // Save the updated user document
    await user.save();

    // Respond with the newly created transaction, showing the actual transaction amount
    res.status(201).json({
      status: 'success',
      message: 'Transaction created successfully',
      data: {
        transaction: newTransaction,
      },
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

    // Prevent updating saving transactions
    if (transaction.isSavingsTransfer) {
      return res.status(403).json({
        status: 'fail',
        message: 'Saving transactions cannot be updated',
      });
    }

    // Reverse the effects of the existing transaction on balance and saving amount
    if (transaction.type === 'income') {
      user.currentBalance -= transaction.transactionAmount;
    } else if (transaction.type === 'expense') {
      user.currentBalance += transaction.transactionAmount;
      if (user.budget && user.budget.categories[transaction.category]) {
        user.budget.categories[transaction.category].spent -= transaction.transactionAmount;
      }
    }

    // Update the transaction fields
    if (date) transaction.date = date;
    if (type) transaction.type = type;
    if (category) transaction.category = category;
    if (transactionAmount) transaction.transactionAmount = transactionAmount;
    if (title) transaction.title = title;

    // Apply the new transaction effects to balance and budget
    if (type === 'income') {
      user.currentBalance += transactionAmount;
    } else if (type === 'expense') {
      user.currentBalance -= transactionAmount;
      if (user.budget && user.budget.categories[category]) {
        user.budget.categories[category].spent += transactionAmount;
      }
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
        (t) => t.isSavingsTransfer && t.date.getTime() === transaction.date.getTime()
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
        user.budget.categories[transaction.category].spent -= transaction.transactionAmount;
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




