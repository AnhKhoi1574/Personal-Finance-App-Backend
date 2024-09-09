// Import
const Joi = require('joi');
const mongoose = require('mongoose');
const { transactionSchema } = require('./transactionModel');
const { savingSchema } = require('./savingModel');

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
    currentBalance: {
      type: Number,
      min: 0,
      default: 0,
    },
    transactions: [transactionSchema],
    saving: savingSchema,
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
    currentBalance: Joi.number().min(0).required(),
  });
  return schema.validate(user);
}

// Export
exports.User = mongoose.model('User', userSchema);
exports.validateUser = validateUser;
