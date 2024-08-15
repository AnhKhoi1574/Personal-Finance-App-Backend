// Import
const Joi = require('joi');
const mongoose = require('mongoose');

// Goal schema
const goalSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    minlength: 3,
    maxlength: 50,
    trim: true,
  },
  description: {
    type: String,
    minlength: 5,
    maxlength: 255,
    trim: true,
  },
  targetAmount: {
    type: Number,
    required: true,
    min: 0,
  },
  savedAmount: {
    type: Number,
    required: true,
    min: 0,
  },
  deadline: {
    type: Date,
    required: true,
  },
  status: {
    type: String,
    enum: ['ongoing', 'achieved', 'failed'],
    required: true,
    trim: true,
  },
});

// Goal model
const Goal = mongoose.model('Goal', goalSchema);

// Joi validation function
function validateGoal(goal) {
  const schema = Joi.object({
    title: Joi.string().min(3).max(50).required(),
    description: Joi.string().min(5).max(255),
    targetAmount: Joi.number().min(0).required(),
    savedAmount: Joi.number().min(0).required(),
    deadline: Joi.date().required(),
    status: Joi.string().valid('ongoing', 'achieved', 'failed').required(),
  });
  return schema.validate(goal);
}

// Export
exports.Goal = Goal;
exports.goalSchema = goalSchema;
exports.validateGoal = validateGoal;
