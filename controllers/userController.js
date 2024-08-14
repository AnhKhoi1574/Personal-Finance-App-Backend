// Import necessary modules
const { User, validateUser } = require('../models/userModel');

// Create a new user profile
exports.createUserProfile = async (req, res) => {
  try {
    // Extract user details from the request body
    const { name, email, password, birthday, initialBalance, currentBalance } = req.body;

    // Validate user input
    const { error } = validateUser(req.body);
    if (error) return res.status(400).json({ status: 'fail', message: error.details[0].message });

    // Create a new user profile
    const newUser = new User({
      name,
      email,
      password,
      birthday,
      initialBalance,
      currentBalance,
    });

    // Save the new user profile
    await newUser.save();

    res.status(201).json({
      status: 'success',
      data: {
        user: newUser,
      },
    });
  } catch (err) {
    res.status(400).json({
      status: 'fail',
      message: err.message,
    });
  }
};

// Get the authenticated user's profile
exports.getUserProfile = async (req, res) => {
  try {
    // Find the user by ID using req.user._id
    const user = await User.findById(req.user._id);

    if (!user) {
      return res.status(404).json({
        status: 'fail',
        message: 'User not found',
      });
    }

    res.status(200).json({
      status: 'success',
      data: {
        user,
      },
    });
  } catch (err) {
    res.status(400).json({
      status: 'fail',
      message: err.message,
    });
  }
};

// Update the authenticated user's profile
exports.updateUserProfile = async (req, res) => {
  try {
    // Find the user by ID using req.user._id
    const user = await User.findById(req.user._id);

    if (!user) {
      return res.status(404).json({
        status: 'fail',
        message: 'User not found',
      });
    }

    // Update the user fields only if they are provided
    const { name, email, password, birthday, initialBalance, currentBalance } = req.body;
    if (name) user.name = name;
    if (email) user.email = email;
    if (password) user.password = password;
    if (birthday) user.birthday = birthday;
    if (initialBalance) user.initialBalance = initialBalance;
    if (currentBalance) user.currentBalance = currentBalance;

    // Save the updated user document
    await user.save();

    res.status(200).json({
      status: 'success',
      data: {
        user,
      },
    });
  } catch (err) {
    res.status(400).json({
      status: 'fail',
      message: err.message,
    });
  }
};

// Delete the authenticated user's profile
exports.deleteUserProfile = async (req, res) => {
  try {
    // Find the user by ID and delete using req.user._id
    const user = await User.findByIdAndDelete(req.user._id);

    if (!user) {
      return res.status(404).json({
        status: 'fail',
        message: 'User not found',
      });
    }

    res.status(204).json({
      status: 'success',
      data: null,
    });
  } catch (err) {
    res.status(400).json({
      status: 'fail',
      message: err.message,
    });
  }
};
