const mongoose = require('mongoose');

// Define the message schema
const messageSchema = new mongoose.Schema(
  {
    role: {
      type: String,
      required: true,
      enum: ['user', 'assistant'],
    },
    content: {
      type: String,
      required: true,
    },
  },
  { _id: false }
);

// Define the settings schema
const settingsSchema = new mongoose.Schema(
  {
    response_length: {
      type: String,
      required: true,
      enum: ['short', 'medium', 'long'],
    },
    temperature: {
      type: Number,
      required: true,
      min: 0,
      max: 1,
      validate: {
        validator: function (v) {
          return v.toFixed(1) === v.toString();
        },
        message: (props) =>
          `${props.value} is not a valid temperature! Only one decimal place is allowed.`,
      },
    },
    language: {
      type: String,
      required: true,
      enum: ['vi', 'en'],
    },
  },
  { _id: false }
);

// Define the conversation schema
const conversationSchema = new mongoose.Schema({
  conversationId: {
    type: String,
    required: true,
    unique: true,
  },
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  title: {
    type: String,
    required: false,
    default: "",
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
  messages: {
    type: [messageSchema],
    default: [],
  },
  settings: {
    type: settingsSchema,
    required: true,
  },
});

// Export the conversation schema
const Conversation = mongoose.model('Conversation', conversationSchema);
module.exports = { Conversation, conversationSchema };
