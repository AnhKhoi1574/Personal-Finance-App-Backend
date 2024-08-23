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
