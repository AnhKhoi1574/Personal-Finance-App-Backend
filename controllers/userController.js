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
    res.status(500).json({
      status: 'error',
      message: 'An error occurred while retrieving user profile',
      error: err.message,
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
    const { name, email, password, birthday } = req.body;
    if (name) user.name = name;
    if (email) user.email = email;
    if (password) {
      const salt = await bcrypt.genSalt(12);
      user.password = await bcrypt.hash(password, salt);
    }
    if (birthday) user.birthday = birthday;

    // Save the updated user document
    await user.save();

    // Remove the password before returning the user data
    user.password = undefined;

    res.status(200).json({
      status: 'success',
      message: 'User profile updated successfully',
      data: {
        user,
      },
    });
  } catch (err) {
    res.status(500).json({
      status: 'error',
      message: 'An error occurred while updating user profile',
      error: err.message,
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
    res.status(500).json({
      status: 'error',
      message: 'An error occurred while deleting the user profile',
      error: err.message,
    });
  }
};
