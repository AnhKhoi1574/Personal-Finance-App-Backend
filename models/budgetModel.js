// Import
const Joi = require('joi');
const mongoose = require('mongoose');

// Budget schema
const budgetSchema = new mongoose.Schema({
  category: {
    type: String,
    required: true,
  },
  date: {
    type: Date,
    required: true,
  },
  limitAmount: {
    type: Number,
    required: true,
    min: 0,
  },
  category1: {
    type: Number,
    required: true,
    min: 0,
  },
});

// Joi validated function
function validateBudget(budget) {
  const schema = Joi.object({
    category: Joi.string().required(),
    date: Joi.date().required(),
    limitAmount: Joi.number().min(0).required(),
    category1: Joi.number().min(0).required(),
  });
  return schema.validate(budget);
}

// Export
exports.Budget = mongoose.model('Budget', budgetSchema);
exports.validateBudget = validateBudget;
