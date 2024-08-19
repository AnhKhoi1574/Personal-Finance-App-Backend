// Import
const Joi = require('joi');
const mongoose = require('mongoose');
const { transactionSchema } = require('./transactionModel');

// User schema
const userSchema = new mongoose.Schema(
  {
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
      min: 0,
    },
    currentBalance: {
      type: Number,
      min: 0,
    },
    transactions: [transactionSchema],
    goals: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Goal',
      },
    ],
    prompts: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Prompt',
      },
    ],
  },
  {
    timestamps: true,
  }
);

// Joi validated function
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

// Export
exports.User = mongoose.model('User', userSchema);
exports.validateUser = validateUser;
