const mongoose = require('mongoose');
const { User } = require('../models/userModel');
const { Conversation } = require('../models/gptModel');
const axios = require('axios');

exports.getAllConversations = async (req, res) => {
  try {
    const user = await User.findById(req.params.userId).populate(
      'conversations'
    );
    if (!user) return res.status(404).send('User not found');

    res.send(user.conversations);
  } catch (error) {
    res.status(500).send('Server error');
  }
};

exports.getConversation = async (req, res) => {
  try {
    const user = await User.findById(req.params.userId);
    if (!user) return res.status(404).send('User not found');

    const conversation = user.conversations.id(req.params.conversationId);
    if (!conversation) return res.status(404).send('Conversation not found');

    res.send(conversation);
  } catch (error) {
    res.status(500).send('Server error');
  }
};

exports.createConversation = async (req, res) => {
  try {
    const user = await User.findById(req.params.userId);
    if (!user) return res.status(404).send('User not found');

    const conversation = new Conversation({
      conversationId: req.body.conversationId,
      messages: req.body.messages,
      settings: req.body.settings,
    });

    user.conversations.push(conversation);
    await user.save();

    res.send(conversation);
  } catch (error) {
    res.status(500).send('Server error');
  }
};

exports.addMessage = async (req, res) => {
  try {
    const user = await User.findById(req.params.userId);
    if (!user) return res.status(404).send('User not found');

    const conversation = user.conversations.id(req.params.conversationId);
    if (!conversation) return res.status(404).send('Conversation not found');

    conversation.messages.push({
      role: req.body.role,
      content: req.body.content,
    });

    await user.save();

    res.send(conversation);
  } catch (error) {
    res.status(500).send('Server error');
  }
};

exports.sendMessageToGpt = async (req, res) => {
  try {
    console.log('User ID:', req.params.userId);
    console.log('Conversation ID:', req.body.conversation_id);
    console.log('Message:', req.body.message);

    const user = await User.findById(req.params.userId);
    if (!user) return res.status(404).send('User not found');

    let conversation;

    if (req.body.conversation_id) {
      conversation = await Conversation.findOne({
        conversationId: req.body.conversation_id,
        user: req.params.userId,
      });
      if (!conversation) return res.status(404).send('Conversation not found');
    } else {
      // Create a new conversation if conversation_id is null or empty
      conversation = new Conversation({
        conversationId: new mongoose.Types.ObjectId().toString(),
        title: "",
        user: req.params.userId,
        messages: [],
        settings: {
          response_length: 'medium', // Default settings, you can change these as needed
          temperature: 0.5,
          language: 'en',
        },
        createdAt: new Date(),
      });
      //   console.log('New Conversation:', conversation);
    }

    // Append the new user message to the conversation
    const newMessage = { role: 'user', content: req.body.message };
    conversation.messages.push(newMessage);

    // Prepare the payload
    const payload = {
      settings: {
        response_length: conversation.settings.response_length,
        temperature: conversation.settings.temperature,
      },
      messages: [...conversation.messages],
    };

    // Send POST request to external GPT service
    const response = await axios.post(
      'http://127.0.0.1:8000/api/generate',
      payload
    );
    if (response.status !== 200) {
      return res
        .status(response.status)
        .send(`Error from FastAPI Service: ${response.statusText}`);
    }

    console.log('\nResponse from the API: \n', response.data.content);

    message = response.data.content
    const conversationTitle = message.title
    conversation.title = conversationTitle
    
    // console.log('\n\n\n\n: ', message.role);
    const assistantMessage = {
      role: message.role,
      content: message.content,
    };
    conversation.messages.push(assistantMessage);

    // Save the updated conversation
    await conversation.save();

    res.send(response.data);
  } catch (error) {
    console.error(error);
    res.status(500).send('Server error');
  }
};
