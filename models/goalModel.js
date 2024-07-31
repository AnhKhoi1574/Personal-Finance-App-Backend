// import
const Joi = require('joi');
const mongoose = require('mongoose');

// Goal schema
const goalSchema = new mongoose.Schema({
  category: {
    type: String,
    required: true,
    minlength: 3,
    maxlength: 50,
    trim: true,
  },
  dueDate: {
    type: Date,
    required: true,
  },
  targetAmount: {
    type: Number,
    required: true,
    min: 0,
    default: 0,
  },
  currentAmount: {
    type: Number,
    required: true,
    min: 0,
  },
});

// Goal model
const Goal = mongoose.model('Goal', goalSchema);

// Joi validated function
function validateGoal(goal) {
  const schema = Joi.object({
    category: Joi.string().min(3).max(50).required(),
    dueDate: Joi.date().min(0).required(),
    targetAmount: Joi.number().min(0).required(),
    currentAmount: Joi.number().min(0).required(),
  });
  return Joi.validate(goal);
}

// export
exports.Goal = Goal;
exports.goalSchema = goalSchema;
exports.validate = validateGoal;
