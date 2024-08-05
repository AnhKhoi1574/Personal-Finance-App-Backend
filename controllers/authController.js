// Import necessary modules
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const { User, validateUser } = require('../models/userModel');

// Utility function to create JWT
const signToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_PRIVATE_KEY, { expiresIn: process.env.JWT_EXPIRES_IN });
};

// User registration
exports.register = async (req, res) => {
  const { error } = validateUser(req.body);
  if (error) return res.status(400).send(error.details[0].message);

  const { name, email, password, birthday, initialBalance, currentBalance } = req.body;

  // Check if the user already exists
  const userExists = await User.findOne({ email });
  if (userExists) return res.status(400).send('User already exists.');

  // Hash the password
  const hashedPassword = await bcrypt.hash(password, 10);

  // Create the user
  const user = new User({
    name,
    email,
    password: hashedPassword,
    birthday,
    initialBalance,
    currentBalance,
    transactions: [],
    goals: [],
    prompts: []
  });

  await user.save();

  // Generate JWT token
  const token = signToken(user._id);

  // Send response to the client
  res.cookie('jwt', token, {
    expires: new Date(Date.now() + process.env.JWT_COOKIE_EXPIRES_IN * 24 * 60 * 60 * 1000),
    secure: process.env.NODE_ENV === 'production',
    httpOnly: true
  });

  res.status(201).json({
    status: 'success',
    token
  });
};

// User login
exports.login = async (req, res) => {
  const { email, password } = req.body;

  // Validate email and password
  if (!email || !password) {
    return res.status(400).send('Please provide email and password.');
  }

  // Check if the user exists
  const user = await User.findOne({ email });
  if (!user) {
    return res.status(400).send('Invalid email or password.');
  }

  // Check if the password is correct
  const validPassword = await bcrypt.compare(password, user.password);
  if (!validPassword) {
    return res.status(400).send('Invalid email or password.');
  }

  // Generate a JWT token
  const token = jwt.sign({ id: user._id }, process.env.JWT_PRIVATE_KEY, { expiresIn: process.env.JWT_EXPIRES_IN });

  // Send response to the client
  res.cookie('jwt', token, {
    expires: new Date(Date.now() + process.env.JWT_COOKIE_EXPIRES_IN * 24 * 60 * 60 * 1000),
    secure: process.env.NODE_ENV === 'production',
    httpOnly: true
  });

  res.status(200).json({
    status: 'success',
    token
  });
};

// Protect routes middleware
exports.protect = async (req, res, next) => {
  let token;

  if (req.cookies.jwt) {
    token = req.cookies.jwt;
  } else if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    token = req.headers.authorization.split(' ')[1];
  }

  if (!token) {
    return res.status(401).send('You are not logged in! Please log in to get access.');
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_PRIVATE_KEY);
    req.user = await User.findById(decoded.id);
    if (!req.user) {
      return res.status(401).send('The user belonging to this token no longer exists.');
    }
    next();
  } catch (err) {
    return res.status(401).send('Invalid token.');
  }
};

// Restrict routes middleware
exports.restrictTo = (...roles) => {
  
};

