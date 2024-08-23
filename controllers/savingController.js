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
    res.status(201).json(newSavingGoal);
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
    res.status(200).json(user.savings);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error });
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
    res.status(200).json(savingGoal);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error });
  }
};

// Update saving
exports.updateSaving = async (req, res) => {
  // Implement the logic to update a saving by ID
};

// Delete saving
exports.deleteSaving = async (req, res) => {
  // Implement the logic to delete a saving by ID
};
