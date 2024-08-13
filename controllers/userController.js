const { User, validateUser } = require('../models/userModel');

// Create user profile
exports.createUserProfile = async (req, res) => {
  try {
    // Create the user using the static method from the model
    const user = await User.createUser(req.body);

    // Respond with the created user data
    res.status(201).json({
      status: 'success',
      data: {
        user,
      },
    });
  } catch (err) {
    res.status(400).json({ status: 'error', message: err.message });
  }
};

// Get user profile by ID
exports.getUserProfile = async (req, res) => {
  try {
    const user = await User.findById(req.params.id).populate('transactions goals prompts');

    if (!user) return res.status(404).send('User not found.');

    res.status(200).json({
      status: 'success',
      data: {
        user
      }
    });
  } catch (err) {
    res.status(500).json({ status: 'error', message: err.message });
  }
};

// Update user profile by ID
exports.updateUserProfile = async (req, res) => {
  try {
    // Validate the incoming request body
    const { error } = validateUser(req.body);
    if (error) return res.status(400).send(error.details[0].message);

    const user = await User.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true
    });

    if (!user) return res.status(404).send('User not found.');

    res.status(200).json({
      status: 'success',
      data: {
        user
      }
    });
  } catch (err) {
    res.status(500).json({ status: 'error', message: err.message });
  }
};

// Delete user profile by ID
exports.deleteUserProfile = async (req, res) => {
  try {
    const user = await User.findByIdAndDelete(req.params.id);
    if (!user) return res.status(404).send('User not found');

    // Return a success message with a 200 status
    res.status(200).json({
      status: 'success',
      message: 'User profile deleted successfully'
    });
  } catch (err) {
    res.status(500).json({ status: 'error', message: err.message });
  }
};
