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
      isAutomaticSavingOn: false,
      savingPercentage: 0,
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

    // Delete the saving goal
    user.saving = undefined;

    // Save the updated user document
    await user.save();

    // Send a success response with a message
    res.status(200).json({
      status: 'success',
      message: 'Saving goal deleted successfully',
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

const { User } = require('../models/userModel');

// Create saving, Get saving, Update saving, Delete saving...

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

    // Check if user has enough balance
    if (user.currentBalance < amount) {
      return res.status(400).json({
        status: 'error',
        message: 'Insufficient balance to add money to saving goal',
      });
    }

    // Deduct amount from current balance
    user.currentBalance -= amount;

    // Add amount to the saving's current amount
    user.saving.currentAmount += amount;

    // Create a transaction for the saving transfer
    user.transactions.push({
      type: 'expense',
      category: 'saving',
      amount,
      date: new Date(),
      isSavingsTransfer: true,
    });

    // Save the updated user document
    await user.save();

    // Respond with the updated saving goal
    res.status(200).json({
      status: 'success',
      message: 'Money added to saving goal successfully',
      data: user.saving,
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: 'An error occurred while adding money to the saving goal',
      error: error.message,
    });
  }
};
