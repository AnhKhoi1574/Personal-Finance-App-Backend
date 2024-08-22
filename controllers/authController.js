// Import necessary modules
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const { promisify } = require('util');
const { User } = require('../models/userModel');

// Function to sign a JWT token
const signToken = (id) => {
  return jwt.sign({ id }, 'your_jwt_secret', { expiresIn: '90d' });
};

// Function to create and send a token via cookie
const createSendToken = (user, statusCode, res) => {
  const token = signToken(user._id);

  const cookieOptions = {
    expires: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000), // 90 days
    httpOnly: true,
  };

  res.cookie('jwt', token, cookieOptions);

  // Remove password from the output
  user.password = undefined;

  res.status(statusCode).json({
    status: 'success',
    token,
    data: {
      user,
    },
  });
};

// Async callback function for user registration
exports.register = async (req, res) => {
  try {
    const { name, email, password, birthday, currentBalance  } = req.body;

    // Create a salt
    const salt = await bcrypt.genSalt(12);

    // Hash the password
    const hashedPassword = await bcrypt.hash(password, salt);

    // Create a new user
    const newUser = await User.create({
      name,
      email,
      password: hashedPassword,
      birthday,
      currentBalance,
    });

    // Send token to user
    createSendToken(newUser, 201, res);
  } catch (err) {
    res.status(400).json({
      status: 'fail',
      message: err.message,
    });
  }
};

// Async callback function for user login
exports.login = async (req, res) => {
  const { email, password } = req.body;

  // 1. Check if email and password exist
  if (!email || !password) {
    return res.status(400).json({
      status: 'fail',
      message: 'Please provide email and password',
    });
  }

  // 2. Check if user exists and password is correct
  const user = await User.findOne({ email }).select('+password');

  if (!user || !(await bcrypt.compare(password, user.password))) {
    return res.status(401).json({
      status: 'fail',
      message: 'Incorrect email or password',
    });
  }

  // 3. If everything is ok, send token to client via cookie
  createSendToken(user, 200, res);
};

// Middleware to protect routes
exports.protect = async (req, res, next) => {
  let token;

  // 1. Getting token and check if it exists
  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith('Bearer')
  ) {
    token = req.headers.authorization.split(' ')[1];
  }

  if (!token && req.cookies) {
    token = req.cookies.jwt;
  }

  if (!token) {
    return res.status(401).json({
      status: 'fail',
      message: 'You are not logged in! Please log in to get access.',
    });
  }

  // 2. Verification token
  try {
    const decoded = await promisify(jwt.verify)(token, 'your_jwt_secret');

    // 3. Check if user still exists
    const currentUser = await User.findById(decoded.id);
    if (!currentUser) {
      return res.status(401).json({
        status: 'fail',
        message: 'The user belonging to this token no longer exists.',
      });
    }

    // Grant access to protected route
    req.user = currentUser;
    next();
  } catch (err) {
    return res.status(401).json({
      status: 'fail',
      message: 'Invalid token. Please log in again.',
    });
  }
};
