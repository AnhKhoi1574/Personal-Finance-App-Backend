// Import
const Joi = require('joi');
const mongoose = require('mongoose');

// Budget Schema
const budgetSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    trim: true,
  },
  startDate: {
    type: Date,
    required: true,
  },
  deadline: {
    type: Date,
    required: true,
  },
  limitAmount: {
    type: Number,
    required: true,
    min: 0,
    default: 0,
  },
  categories: {
    household: {
      limit: { type: Number, required: true, min: 0 },
      spent: { type: Number, default: 0, min: 0 },
    },
    shopping: {
      limit: { type: Number, required: true, min: 0 },
      spent: { type: Number, default: 0, min: 0 },
    },
    food: {
      limit: { type: Number, required: true, min: 0 },
      spent: { type: Number, default: 0, min: 0 },
    },
    utilities: {
      limit: { type: Number, required: true, min: 0 },
      spent: { type: Number, default: 0, min: 0 },
    },
    transportation: {
      limit: { type: Number, required: true, min: 0 },
      spent: { type: Number, default: 0, min: 0 },
    },
    saving: {
      limit: { type: Number, required: true, min: 0 },
      spent: { type: Number, default: 0, min: 0 },
    },
    others: {
      limit: { type: Number, required: true, min: 0 },
      spent: { type: Number, default: 0, min: 0 },
    },
  },
}, { timestamps: true });

const Budget = mongoose.model('Budget', budgetSchema);

// Joi validated function
function validateBudget(budget) {
  const schema = Joi.object({
    title: Joi.string().trim().required(),
    startDate: Joi.date().required(),
    deadline: Joi.date().required(),
    limitAmount: Joi.number().min(0).required(),
    categories: Joi.object({
      household: Joi.object({
        limit: Joi.number().min(0).required(),
        spent: Joi.number().min(0).default(0),
      }).required(),
      shopping: Joi.object({
        limit: Joi.number().min(0).required(),
        spent: Joi.number().min(0).default(0),
      }).required(),
      food: Joi.object({
        limit: Joi.number().min(0).required(),
        spent: Joi.number().min(0).default(0),
      }).required(),
      utilities: Joi.object({
        limit: Joi.number().min(0).required(),
        spent: Joi.number().min(0).default(0),
      }).required(),
      transportation: Joi.object({
        limit: Joi.number().min(0).required(),
        spent: Joi.number().min(0).default(0),
      }).required(),
      saving: Joi.object({
        limit: Joi.number().min(0).required(),
        spent: Joi.number().min(0).default(0),
      }).required(),
      others: Joi.object({
        limit: Joi.number().min(0).required(),
        spent: Joi.number().min(0).default(0),
      }).required(),
    }).required(),
  });

  return schema.validate(budget);
}

// Export
module.exports = {
  Budget,
  validateBudget,
  budgetSchema, // Export budgetSchema
};
