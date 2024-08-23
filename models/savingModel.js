// import
const Joi = require('joi');
const mongoose = require('mongoose');

// Saving schema
const savingSchema = new mongoose.Schema({
  goalName: {
    type: String,
    required: true,
  },
  targetAmount: {
    type: Number,
    required: true,
  },
  currentAmount: {
    type: Number,
    default: 0,
  },
  targetDate: {
    type: Date,
    required: true,
  },
  isAutoSavingEnabled: {
    type: Boolean,
    default: false, // Indicates if auto-saving is turned on
  },
  autoSavingPercentage: {
    type: Number,
    min: 0,
    max: 100,
    default: 0, // Percentage of each income transaction to move to savings
  },
});

// Saving model
const Saving = mongoose.model('Saving', savingSchema);

// Joi validated function
function validateSaving(saving) {
  const schema = Joi.object({
    goalName: Joi.string().required(),
    targetAmount: Joi.number().min(0).required(),
    currentAmount: Joi.number().min(0).required(),
    targetDate: Joi.date().required(),
    isAutoSavingEnabled: Joi.boolean(),
    autoSavingPercentage: Joi.number().min(0).max(100),
  });
  return schema.validate(saving);
}

// export
exports.Saving = Saving;
exports.savingSchema = savingSchema;
exports.validateSaving = validateSaving;
