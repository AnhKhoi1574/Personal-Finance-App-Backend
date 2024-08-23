const { Saving } = require('../models/savingModel');
const { User } = require('../models/userModel');

// Create saving
exports.createSaving = async (req, res) => {
  try {
    const userId = req.user._id;
    const { goalName, targetAmount, targetDate } = req.body;

    // Validate input
    if (!goalName || !targetAmount || !targetDate) {
      return res.status(400).json({ message: 'All fields are required' });
    }

    // Find the user by ID
    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Create a new saving goal
    const newSavingGoal = {
      goalName,
      targetAmount,
      targetDate,
      currentAmount: 0, // Initially, the saved amount is 0
      // createdAt: new Date(),
    };

    // Add the new saving goal to the user's savings array
    user.savings.push(newSavingGoal);

    // Save the user document
    await user.save();

    // Respond with the newly created saving goal
    res.status(201).json({
      status: 'success',
      message: 'Saving goal created successfully',
      data: newSavingGoal
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error });
  }
};

// Get all savings
exports.getAllSavings = async (req, res) => {
  try {
    const userId = req.user._id;

    // Find the user by ID and select only the savings field
    const user = await User.findById(userId).select('savings');

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Return all savings goals
    res.status(200).json({
      status: 'success',
      message: 'Saving goals retrieved successfully',
      data: user.savings,
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: 'An error occurred while retrieving savings goals',
      error: error.message,
    });
  }
};

// Get specific saving
exports.getSpecificSaving = async (req, res) => {
  try {
    const userId = req.user._id;
    const savingId = req.params.savingId;

    // Find the user by ID and populate the savings array
    const user = await User.findById(userId).select('savings');

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Find the specific saving goal by its ID
    const savingGoal = user.savings.id(savingId);

    if (!savingGoal) {
      return res.status(404).json({ message: 'Saving goal not found' });
    }

    // Respond with the saving goal
    res.status(200).json({
      status: 'success',
      data: savingGoal,
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: 'An error occurred while retrieving the saving goal',
      error: error.message,
    });
  }
};

// Update saving
exports.updateSaving = async (req, res) => {
  try {
    const userId = req.user._id;
    const savingId = req.params.savingId;
    const { goalName, targetAmount, currentAmount, targetDate, isAutoSavingEnabled, autoSavingPercentage } = req.body;

    // Find the user by ID
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        status: 'fail',
        message: 'User not found',
      });
    }

    // Find the saving goal by ID within the user's savings array
    const savingGoal = user.savings.id(savingId);
    if (!savingGoal) {
      return res.status(404).json({
        status: 'fail',
        message: 'Saving goal not found',
      });
    }

    // Update the saving goal fields
    if (goalName !== undefined) savingGoal.goalName = goalName;
    if (targetAmount !== undefined) savingGoal.targetAmount = targetAmount;
    if (currentAmount !== undefined) savingGoal.currentAmount = currentAmount;
    if (targetDate !== undefined) savingGoal.targetDate = targetDate;
    if (isAutoSavingEnabled !== undefined) savingGoal.isAutoSavingEnabled = isAutoSavingEnabled;
    if (autoSavingPercentage !== undefined) savingGoal.autoSavingPercentage = autoSavingPercentage;

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
    const userId = req.user._id;
    const savingId = req.params.savingId;

    // Find the user by ID
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        status: 'fail',
        message: 'User not found',
      });
    }

    // Find the saving goal in the user's savings array
    const savingIndex = user.savings.findIndex(
      (saving) => saving._id.toString() === savingId
    );

    if (savingIndex === -1) {
      return res.status(404).json({
        status: 'fail',
        message: 'Saving goal not found',
      });
    }

    // Remove the saving goal from the user's savings array
    user.savings.splice(savingIndex, 1);

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

