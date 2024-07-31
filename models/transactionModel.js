// import
const Joi = require('joi');
const mongoose = require('mongoose');

// Transaction schema
const transactionSchema = new mongoose.Schema({
  date: {
    type: Date,
    required: true,
  },
  type: {
    type: String,
    enum: ['income', 'expense'],
    required: true,
    trim: true,
  },
  category: {
    type: String,
    required: true,
    minlength: 3,
    maxlength: 50,
    trim: true,
  },
  transactionAmount: {
    type: Number,
    required: true,
    min: 0,
  },
  description: {
    type: String,
    minlength: 3,
    maxlength: 50,
    trim: true,
  },
});

// Transaction model
const Transaction = mongoose.model('Transaction', transactionSchema);

// Joi validated function
function validateTransaction(transaction) {
  const schema = Joi.object({
    date: Joi.date().required(),
    type: Joi.string().required(),
    category: Joi.string().min(3).max(50).required(),
    transactionAmount: Joi.number().min(0).required(),
    description: Joi.string().min(3).max(50),
  });
  return Joi.validate(transaction);
}

// export
exports.Transaction = Transaction;
exports.transactionSchema = transactionSchema;
exports.validate = validateTransaction;
