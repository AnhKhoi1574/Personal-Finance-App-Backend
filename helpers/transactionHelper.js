const { User } = require('../models/userModel');
const {
  Transaction,
  validateTransaction,
} = require('../models/transactionModel');

async function createTransactionHelper(
  userId,
  date,
  type,
  transactionAmount,
  category,
  title
) {
  try {
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

    // Find the user by ID and populate saving data
    const user = await User.findById(userId).populate('saving');
    if (!user) {
      return res
        .status(404)
        .json({ status: 'error', message: 'User not found' });
    }

    let actualTransactionAmount = transactionAmount;

    // Create the transaction
    const newTransaction = new Transaction({
      date,
      type,
      category,
      transactionAmount,
      title,
      isSavingsTransfer: false,
    });

    // Handle automatic savings if the transaction is of type 'income'
    if (
      type === 'income' &&
      user.saving &&
      user.saving.isAutoSavingEnabled &&
      user.saving.autoSavingPercentage > 0
    ) {
      const savingAmount =
        (transactionAmount * user.saving.autoSavingPercentage) / 100;

      user.saving.currentAmount += savingAmount;
      actualTransactionAmount -= savingAmount;

      // Create a corresponding savings transaction
      const savingTransaction = new Transaction({
        date: new Date(),
        type: 'expense',
        category: 'saving',
        transactionAmount: savingAmount,
        title: 'Saving from income',
        isSavingsTransfer: true,
      });

      // Add the savings transaction to the user's transactions
      user.transactions.push(savingTransaction);
    }

    // Add the new transaction to the user's transactions
    user.transactions.push(newTransaction);

    // Update the user's current balance
    user.currentBalance +=
      type === 'income' ? actualTransactionAmount : -transactionAmount;

    // Save the updated user document
    await user.save();
    return newTransaction;
  } catch (error) {
    console.log(error);
    throw new Error('An error occurred while creating the transaction');
  }
}

module.exports = { createTransactionHelper };
