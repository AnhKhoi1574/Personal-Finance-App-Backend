const Joi = require('joi');
const mongoose = require('mongoose');

// Prompt schema
const promptSchema = new mongoose.Schema({
  role: {
    type: String,
    enum: ['user', 'ai'],
    required: true,
    trim: true,
  },
  content: {
    type: String,
    required: true,
    minlength: 3,
    maxlength: 250,
    trim: true,
  },
  createdDate: {
    type: Date,
    required: true,
    default: Date.now,
  },
});

// Prompt model
const Prompt = mongoose.model('Prompt', promptSchema);

// Joi validated function
function validatePrompt(prompt) {
  const schema = Joi.object({
    role: Joi.string().valid('user', 'ai').required(),
    content: Joi.string().min(3).max(250).required(),
    createdDate: Joi.date(),
  });
  return schema.validate(prompt);
}

// Export
exports.Prompt = Prompt;
exports.validatePrompt = validatePrompt;
