const { Goal, validateGoal } = require('../models/goalModel');
const { User } = require('../models/userModel');

// Create goal
exports.createGoal = async (req, res) => {
  try {
    const { title, description, targetAmount, savedAmount, deadline, status } = req.body;

    // Validate goal data
    const { error } = validateGoal(req.body);
    if (error) {
      return res.status(400).json({ status: 'fail', message: error.details[0].message });
    }

    // Find the user by ID
    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(404).json({ status: 'fail', message: 'User not found' });
    }

    // Create a new goal
    const newGoal = new Goal({ title, description, targetAmount, savedAmount, deadline, status });

    // Add the goal to the user's goals array
    user.goals.push(newGoal);

    // Save the updated user document
    await user.save();

    // Send a success response with the new goal data
    res.status(201).json({
      status: 'success',
      data: {
        newGoal,
      },
    });
  } catch (err) {
    res.status(500).json({ status: 'error', message: 'An error occurred while creating the goal' });
  }
};

// Get all goals
exports.getAllGoals = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);

    if (!user) {
      return res.status(404).json({ status: 'fail', message: 'User not found' });
    }

    const goals = user.goals;

    res.status(200).json({
      status: 'success',
      data: {
        goals,
      },
    });
  } catch (err) {
    res.status(500).json({ status: 'error', message: 'An error occurred while retrieving goals' });
  }
};

// Get specific goal
exports.getSpecificGoal = async (req, res) => {
  try {
    const userId = req.user._id;
    const goalId = req.params.goalId;

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ status: 'fail', message: 'User not found' });
    }

    const goal = user.goals.id(goalId);
    if (!goal) {
      return res.status(404).json({ status: 'fail', message: 'Goal not found' });
    }

    res.status(200).json({
      status: 'success',
      data: {
        goal,
      },
    });
  } catch (err) {
    res.status(500).json({ status: 'error', message: 'An error occurred while retrieving the goal' });
  }
};

// Update goal
exports.updateGoal = async (req, res) => {
  try {
    const userId = req.user._id;
    const goalId = req.params.goalId;
    const { title, description, targetAmount, savedAmount, deadline, status } = req.body;

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ status: 'fail', message: 'User not found' });
    }

    const goal = user.goals.id(goalId);
    if (!goal) {
      return res.status(404).json({ status: 'fail', message: 'Goal not found' });
    }

    if (title) goal.title = title;
    if (description) goal.description = description;
    if (targetAmount) goal.targetAmount = targetAmount;
    if (savedAmount) goal.savedAmount = savedAmount;
    if (deadline) goal.deadline = deadline;
    if (status) goal.status = status;

    await user.save();

    res.status(200).json({
      status: 'success',
      data: {
        goal,
      },
    });
  } catch (err) {
    res.status(500).json({ status: 'error', message: 'An error occurred while updating the goal' });
  }
};

// Delete goal
exports.deleteGoal = async (req, res) => {
  try {
    const userId = req.user._id;
    const goalId = req.params.goalId;

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ status: 'fail', message: 'User not found' });
    }

    const goalIndex = user.goals.findIndex(goal => goal._id.toString() === goalId);
    if (goalIndex === -1) {
      return res.status(404).json({ status: 'fail', message: 'Goal not found' });
    }

    user.goals.splice(goalIndex, 1);
    await user.save();

    res.status(204).json({
      status: 'success',
      message: 'Goal deleted successfully',
    });
  } catch (err) {
    res.status(500).json({ status: 'error', message: 'An error occurred while deleting the goal' });
  }
};
