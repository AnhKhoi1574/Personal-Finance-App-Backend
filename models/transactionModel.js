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
    lowercase: true,
  },
  category: {
    type: String,
    // enum: [
    //   'household',
    //   'shopping',
    //   'food',
    //   'utilities',
    //   'transportation',
    //    'saving'
    //   'others',
    // ],
    required: true,
    trim: true,
    lowercase: true,
  },
  transactionAmount: {
    type: Number,
    required: true,
    min: 0,
  },
  title: {
    type: String,
    minlength: 3,
    maxlength: 50,
    trim: true,
  },
  isSavingsTransfer: { type: Boolean, default: false }, // check if it is a transfer related to saving amount
});

// Transaction model
const Transaction = mongoose.model('Transaction', transactionSchema);

// Joi validated function
function validateTransaction(transaction) {
  const schema = Joi.object({
    date: Joi.date().required(),
    type: Joi.string().valid('income', 'expense').required(),
    category: Joi.string().min(3).max(50).required(),
    transactionAmount: Joi.number().min(0).required(),
    title: Joi.string().min(3).max(50),
  });
  return schema.validate(transaction);
}

// export
exports.Transaction = Transaction;
exports.transactionSchema = transactionSchema;
exports.validateTransaction = validateTransaction;
