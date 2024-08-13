// Import
const Joi = require('joi');
const mongoose = require('mongoose');

// User schema
const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    minlength: 5,
    maxlength: 50,
    trim: true,
  },
  email: {
    type: String,
    required: true,
    unique: true,
    minlength: 10,
    maxlength: 50,
    lowercase: true,
    trim: true,
  },
  password: {
    type: String,
    required: true,
    minlength: 5,
  },
  birthday: {
    type: Date,
    required: true,
  },
  initialBalance: {
    type: Number,
    required: true,
    min: 0,
  },
  currentBalance: {
    type: Number,
    required: true,
    min: 0,
  },
  transactions: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Transaction',
    required: true,
  }],
  goals: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Goal',
  }],
  prompts: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Prompt',
  }],
}, {
  timestamps: true,
});

// Joi validation function
function validateUser(user) {
  const schema = Joi.object({
    name: Joi.string().min(5).max(50).required(),
    email: Joi.string().email().min(10).max(50).required(),
    password: Joi.string().min(5).required(),
    birthday: Joi.date().required(),
    initialBalance: Joi.number().min(0).required(),
    currentBalance: Joi.number().min(0).required(),
  });
  return schema.validate(user);
}

// Static method to create a user
userSchema.statics.createUser = async function (userData) {
  // Validate the incoming data
  const { error } = validateUser(userData);
  if (error) throw new Error(error.details[0].message);

  // Check if the user already exists
  let user = await this.findOne({ email: userData.email });
  if (user) throw new Error('User already registered.');

  // Create and save the new user
  user = new this(userData);
  await user.save();

  return {
    id: user._id,
    name: user.name,
    email: user.email,
  };
};

// Export
exports.User = mongoose.model('User', userSchema);
exports.validateUser = validateUser;
