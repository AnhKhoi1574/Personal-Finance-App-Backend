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

async function updateTransactionHelper(
  userId,
  transactionId,
  date,
  type,
  category,
  transactionAmount,
  title
) {
  try {
    console.log(userId)
    // Find the user by ID
    const user = await User.findById(userId);
    if (!user) {
      throw new Error('User not found');
    }

    // Find the transaction by ID within the user's transactions array
    const transaction = user.transactions.id(transactionId);
    if (!transaction) {
      throw new Error('Transaction not found');
    }

    // Prevent updating saving transactions
    if (transaction.isSavingsTransfer) {
      throw new Error('Saving transactions cannot be updated');
    }

    // Reverse the effects of the existing transaction on balance and saving amount
    if (transaction.type === 'income') {
      user.currentBalance -= transaction.transactionAmount;
    } else if (transaction.type === 'expense') {
      user.currentBalance += transaction.transactionAmount;
      if (user.budget && user.budget.categories[transaction.category]) {
        user.budget.categories[transaction.category].spent -=
          transaction.transactionAmount;
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

    return transaction;
  } catch (error) {
    console.log(error);
    throw new Error('An error occurred while updating the transaction');
  }
}

module.exports = { createTransactionHelper, updateTransactionHelper };
