// Import necessary modules
const bcrypt = require('bcrypt');
const { User, validateUser } = require('../models/userModel');

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

      // Remove the password before returning the user data
      user.password = undefined;

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
    const { name, email, password, birthday, currentBalance } = req.body;
    if (name) user.name = name;
    if (email) user.email = email;
    if (password) {
      const salt = await bcrypt.genSalt(12);
      user.password = await bcrypt.hash(password, salt);
    }
    if (birthday) user.birthday = birthday;
    if (currentBalance !== undefined) user.currentBalance = currentBalance;

    // Save the updated user document
    await user.save();

    // Remove the password before returning the user data
    user.password = undefined;

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

    res.status(200).json({
      status: 'success',
      message: 'User profile deleted successfully',
      data: null,
    });
  } catch (err) {
    res.status(400).json({
      status: 'fail',
      message: err.message,
    });
  }
};

