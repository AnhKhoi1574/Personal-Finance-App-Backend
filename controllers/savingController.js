const { Saving } = require('../models/savingModel');
const { User } = require('../models/userModel');

// Create saving
exports.createSaving = async (req, res) => {
  try {
    const userId = req.user._id;
    const { goalName, targetAmount, targetDate } = req.body;

    // Validate input
    if (!goalName || !targetAmount || !targetDate) {
      return res.status(400).json({
        status: 'error',
        message: 'All fields are required',
      });
    }

    // Find the user by ID
    const user = await User.findById(userId);

    if (!user) {
      return res
        .status(404)
        .json({ status: 'error', message: 'User not found' });
    }

    // Check if a saving already exists
    if (user.saving) {
      return res.status(400).json({
        message:
          'A saving goal already exists. Please delete it before creating a new one.',
      });
    }

    // Create a new saving goal
    const newSavingGoal = {
      goalName,
      targetAmount,
      targetDate,
      currentAmount: 0, // Initially, the saved amount is 0
      isAutoSavingEnabled: false,
      autoSavingPercentage: 0,
    };

    // Save the user document
    user.saving = newSavingGoal;
    await user.save();

    // Respond with the newly created saving goal
    res.status(201).json({
      status: 'success',
      message: 'Saving goal created successfully',
      data: newSavingGoal,
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error });
  }
};

// Get current saving
exports.getSaving = async (req, res) => {
  try {
    const userId = req.user._id;

    // Find the user by ID and select only the saving field
    const user = await User.findById(userId).select('saving');

    if (!user) {
      return res
        .status(404)
        .json({ status: 'error', message: 'User not found' });
    }

    if (!user.saving) {
      return res
        .status(404)
        .json({ status: 'error', message: 'No saving goal found' });
    }

    // Return saving
    res.status(200).json({
      status: 'success',
      message: 'Saving amount retrieved successfully',
      data: user.saving,
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: 'An error occurred while retrieving saving goals',
      error: error.message,
    });
  }
};

// Update saving
exports.updateSaving = async (req, res) => {
  try {
    // Find the user by ID
    const userId = req.user._id;
    const user = await User.findById(userId);

    const { goalName, targetAmount, targetDate } = req.body;

    if (!user) {
      return res.status(404).json({
        status: 'fail',
        message: 'User not found',
      });
    }

    if (!user.saving) {
      return res.status(404).json({
        status: 'fail',
        message: 'Saving goal not found',
      });
    }

    // Find the saving goal of user
    const savingGoal = user.saving;

    // Update the saving goal fields
    if (goalName !== undefined) savingGoal.goalName = goalName;
    if (targetAmount !== undefined) savingGoal.targetAmount = targetAmount;
    if (targetDate !== undefined) savingGoal.targetDate = targetDate;

    // Save the updated user document
    await user.save();

    // Send a success response with the updated saving goal data
    res.status(200).json({
      status: 'success',
      message: 'Saving goal updated successfully',
      data: savingGoal,
    });
  } catch (err) {
    res.status(500).json({
      status: 'error',
      message: 'An error occurred while updating the saving goal',
      error: err.message,
    });
  }
};

// Delete saving
exports.deleteSaving = async (req, res) => {
  try {
    // Find the user by ID
    const userId = req.user._id;
    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({
        status: 'fail',
        message: 'User not found',
      });
    }

    if (!user.saving) {
      return res.status(404).json({
        status: 'fail',
        message: 'Saving goal not found',
      });
    }

    // Transfer the saving amount back to the current balance
    user.currentBalance += user.saving.currentAmount;

    // Delete the saving goal
    user.saving = undefined;

    // Save the updated user document
    await user.save();

    // Send a success response with the updated balance
    res.status(200).json({
      status: 'success',
      message: 'Saving goal deleted successfully, and funds transferred to current balance',
      data: {
        currentBalance: user.currentBalance,
      },
    });
  } catch (err) {
    // Handle any errors during the process
    res.status(500).json({
      status: 'error',
      message: 'An error occurred while deleting the saving goal',
    });
    console.error(err);
  }
};


// Add money to saving
exports.addMoneyToSaving = async (req, res) => {
  try {
    const userId = req.user._id;
    const { amount } = req.body;

    // Validate input
    if (!amount || amount <= 0) {
      return res.status(400).json({
        status: 'error',
        message: 'Amount must be a positive number',
      });
    }

    // Find the user by ID
    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({
        status: 'fail',
        message: 'User not found',
      });
    }

    if (!user.saving) {
      return res.status(404).json({
        status: 'fail',
        message: 'No saving goal found',
      });
    }

    // Check if the savings goal has been reached
    if (user.saving.currentAmount >= user.saving.targetAmount) {
      return res.status(400).json({
        status: 'error',
        message: 'Target amount reached. Please increase the target amount or delete the saving goal.',
      });
    }

    // Check if user has enough balance
    if (user.currentBalance < amount) {
      return res.status(400).json({
        status: 'error',
        message: 'Insufficient balance to add money to saving goal',
      });
    }

    // Calculate the new saving amount after adding
    const newSavingAmount = user.saving.currentAmount + amount;

    // Ensure the new saving amount does not exceed the target amount
    if (newSavingAmount > user.saving.targetAmount) {
      return res.status(400).json({
        status: 'error',
        message: `Cannot add ${amount}. It would exceed the target amount. You can only add up to ${user.saving.targetAmount - user.saving.currentAmount}.`,
      });
    }

    // Deduct amount from current balance
    user.currentBalance -= amount;

    // Add amount to the saving's current amount
    user.saving.currentAmount = newSavingAmount;

    // Create a transaction for the saving transfer
    const addMoneyTransaction = {
      type: 'expense',
      category: 'saving',
      transactionAmount: amount,
      date: new Date(),
      isSavingsTransfer: true,
    };
    user.transactions.push(addMoneyTransaction);

    // Save the updated user document
    await user.save();

    // Respond with the updated saving goal
    res.status(200).json({
      status: 'success',
      message: 'Money added to saving goal successfully',
      data: {
        currentSaving: user.saving,
        currentBalance: user.currentBalance,
        transaction: addMoneyTransaction,
      },
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: 'An error occurred while adding money to the saving goal',
      error: error.message,
    });
  }
};

// Withdraw Money from Saving Goal
exports.withdrawFromSaving = async (req, res) => {
  try {
    const userId = req.user._id;
    const { amount } = req.body;

    // Validate input
    if (!amount || amount <= 0) {
      return res.status(400).json({
        status: 'error',
        message: 'Please provide a valid amount to withdraw',
      });
    }

    // Find the user by ID
    const user = await User.findById(userId);

    if (!user) {
      return res
        .status(404)
        .json({ status: 'error', message: 'User not found' });
    }

    if (!user.saving) {
      return res.status(404).json({
        status: 'error',
        message: 'No saving goal found to withdraw from',
      });
    }

    // Check if the currentAmount is sufficient
    if (user.saving.currentAmount < amount) {
      return res.status(400).json({
        status: 'error',
        message: 'Insufficient saving amount to withdraw',
      });
    }

    // Deduct the amount from the saving goal
    user.saving.currentAmount -= amount;

    // Add the withdrawn amount to the user's current balance
    user.currentBalance += amount;

    // Create a new transaction for the withdrawal
    const withdrawalTransaction = {
      type: 'income',
      transactionAmount: amount,
      date: new Date(),
      isSavingsTransfer: true,
    };

    user.transactions.push(withdrawalTransaction);

    // Save the updated user document
    await user.save();

    // Respond with the updated saving goal and current balance
    res.status(200).json({
      status: 'success',
      message: 'Money withdrawn from saving successfully',
      data: {
        currentSaving: user.saving,
        currentBalance: user.currentBalance,
        transaction: withdrawalTransaction,
      },
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: 'An error occurred while withdrawing money from the saving goal',
      error: error.message,
    });
  }
};

exports.toggleAutomaticSaving = async (req, res) => {
  try {
    const userId = req.user._id;
    const { isAutoSavingEnabled, autoSavingPercentage } = req.body;

    // Validate input
    // Condition 1: Check if "isAutoSavingEnabled" is undefined
    if (isAutoSavingEnabled === undefined) {
      return res.status(400).json({
        status: 'error',
        message: 'isAutoSavingEnabled must be provided',
      });
    }

    // Condition 2: Check if "isAutoSavingEnabled" is turned on, but user do not input the "autoSavingPercentage"
    if (isAutoSavingEnabled && autoSavingPercentage === undefined) {
      return res.status(400).json({
        status: 'error',
        message:
          'When auto-saving is enabled, autoSavingPercentage must be provided.',
      });
    }

    // Condition 3: Check if "autoSavingPercentage" must be between 1 and 50
    if (
      autoSavingPercentage !== undefined &&
      (autoSavingPercentage < 1 || autoSavingPercentage > 50)
    ) {
      return res.status(400).json({
        status: 'error',
        message: 'If provided, autoSavingPercentage must be between 1 and 50.',
      });
    }
    // Find the user by ID
    const user = await User.findById(userId);

    if (!user) {
      return res
        .status(404)
        .json({ status: 'error', message: 'User not found' });
    }

    if (!user.saving) {
      return res
        .status(404)
        .json({ status: 'error', message: 'No saving goal found' });
    }

    // Update the automatic saving settings
    user.saving.isAutoSavingEnabled = isAutoSavingEnabled;
    if (autoSavingPercentage !== undefined) {
      user.saving.autoSavingPercentage = autoSavingPercentage;
    }

    // Save the updated user document
    await user.save();

    // Respond with the updated saving settings
    res.status(200).json({
      status: 'success',
      message: 'Automatic saving settings updated successfully',
      data: {
        isAutoSavingEnabled: user.saving.isAutoSavingEnabled,
        autoSavingPercentage: user.saving.autoSavingPercentage,
      },
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: 'An error occurred while updating automatic saving settings',
      error: error.message,
    });
  }
};
