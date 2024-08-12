const User = require('../models/userModel').User;
const { validateUser } = require('../models/userModel');

// Create user profile
exports.createUserProfile = async (req, res) => {
  try {
    // Validate the incoming request body
    const { error } = validateUser(req.body);
    if (error) return res.status(400).send(error.details[0].message);

    // Check if the user already exists
    let user = await User.findOne({ email: req.body.email });
    if (user) return res.status(400).send('User already registered.');

    // Create a new user
    user = new User(req.body);

    // Save the user to the database
    await user.save();

    res.status(201).json({
      status: 'success',
      data: {
        user: {
          id: user._id,
          name: user.name,
          email: user.email
        }
      }
    });
  } catch (err) {
    res.status(500).json({ status: 'error', message: err.message });
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
