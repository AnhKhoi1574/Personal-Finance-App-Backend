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
  },
  { _id: false }
);

// Define the conversation schema
const conversationSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  title: {
    type: String,
    required: false,
    default: '',
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

const smallConversationSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    unique: true, // One user can only have one small conversation
  },
  title: {
    type: String,
    required: false,
    default: 'Small chat dialog',
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
  messages: {
    type: [messageSchema],
    default: [],
  },
});

// Export the conversation schema
const Conversation = mongoose.model('Conversation', conversationSchema);

// Small Conversation is the small dialog on each page
const SmallConversation = mongoose.model('SmallConversation', smallConversationSchema);
module.exports = { Conversation, SmallConversation, conversationSchema };
