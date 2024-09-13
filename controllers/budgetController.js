const {Budget} = require('../models/budgetModel');
const { User } = require('../models/userModel');

// Create budget
exports.createBudget = async (req, res) => {
  try {
    const userId = req.user._id;
    const { title, startDate, deadline, categories } = req.body;

    // Check if a budget already exists for the user
    const user = await User.findById(userId);
    if (user.budget) {
      return res.status(400).json({
        status: 'fail',
        message: 'A budget already exists. Please delete it before creating a new one.',
      });
    }

    // Initialize the spent fields to 0 for each category
    Object.keys(categories).forEach((category) => {
      categories[category].spent = 0;
    });

    // Calculate the total limit amount
    const limitAmount = Object.values(categories).reduce((total, category) => total + category.limit, 0);

    // Calculate the spent amount for each category based on ALL transactions between the startDate and deadline
    user.transactions.forEach((transaction) => {
      if (
        transaction.type === 'expense' &&
        new Date(transaction.date) >= new Date(startDate) &&
        new Date(transaction.date) <= new Date(deadline) &&
        categories[transaction.category]
      ) {
        categories[transaction.category].spent += transaction.transactionAmount;
      }
    });

    // Create the budget
    const newBudget = {
      title,
      startDate,
      deadline,
      limitAmount,
      categories,
    };

    // Save the budget to the user document
    user.budget = newBudget;
    await user.save();

    res.status(201).json({
      status: 'success',
      message: 'Budget created successfully',
      data: user.budget,
    });
  } catch (err) {
    res.status(500).json({
      status: 'error',
      message: 'An error occurred while creating the budget',
      error: err.message,
    });
  }
};

// Retrieve the current budget
exports.getBudget = async (req, res) => {
  try {
    const userId = req.user._id;

    // Find the user's budget
    const user = await User.findById(userId).select('budget');
    if (!user || !user.budget) {
      return res.status(404).json({
        status: 'fail',
        message: 'No budget found',
      });
    }

    res.status(200).json({
      status: 'success',
      data: user.budget,
    });
  } catch (err) {
    res.status(500).json({
      status: 'error',
      message: 'An error occurred while retrieving the budget',
      error: err.message,
    });
  }
};

// Update the existing budget
exports.updateBudget = async (req, res) => {
  try {
    const userId = req.user._id;
    const { title, startDate, deadline, categories } = req.body;

    // Find the user's budget
    const user = await User.findById(userId);
    if (!user || !user.budget) {
      return res.status(404).json({
        status: 'fail',
        message: 'No budget found to update',
      });
    }

    // Update the title if provided
    if (title) user.budget.title = title;

    // Update the categories and recalculate the limitAmount if categories are provided
    if (categories) {
      Object.keys(categories).forEach((category) => {
        if (user.budget.categories[category]) {
          user.budget.categories[category].limit = categories[category].limit || user.budget.categories[category].limit;
        }
      });

      // Recalculate the total limitAmount
      user.budget.limitAmount = Object.values(user.budget.categories).reduce((total, category) => total + category.limit, 0);
    }

    // If startDate or deadline is provided, update and recalculate spent amounts
    if (startDate || deadline) {
      if (startDate) user.budget.startDate = startDate;
      if (deadline) user.budget.deadline = deadline;

      // Reset spent amounts for each category
      Object.keys(user.budget.categories).forEach((category) => {
        user.budget.categories[category].spent = 0;
      });

      // Recalculate the spent amount for each category based on transactions within the new date range
      user.transactions.forEach((transaction) => {
        if (
          transaction.type === 'expense' &&
          new Date(transaction.date) >= new Date(user.budget.startDate) &&
          new Date(transaction.date) <= new Date(user.budget.deadline) &&
          user.budget.categories[transaction.category]
        ) {
          user.budget.categories[transaction.category].spent += transaction.transactionAmount;
        }
      });
    }

    // Save the updated budget
    await user.save();

    res.status(200).json({
      status: 'success',
      message: 'Budget updated successfully',
      data: user.budget,
    });
  } catch (err) {
    res.status(500).json({
      status: 'error',
      message: 'An error occurred while updating the budget',
      error: err.message,
    });
  }
};

// Delete the existing budget
exports.deleteBudget = async (req, res) => {
  try {
    const userId = req.user._id;

    // Find the user's budget
    const user = await User.findById(userId);
    if (!user || !user.budget) {
      return res.status(404).json({
        status: 'fail',
        message: 'No budget found to delete',
      });
    }

    // Remove the budget from the user document
    user.budget = undefined;
    await user.save();

    res.status(200).json({
      status: 'success',
      message: 'Budget deleted successfully',
    });
  } catch (err) {
    res.status(500).json({
      status: 'error',
      message: 'An error occurred while deleting the budget',
      error: err.message,
    });
  }
};
