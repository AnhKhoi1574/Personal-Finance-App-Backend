const mongoose = require('mongoose');
const { User } = require('../models/userModel');
const { Conversation, SmallConversation } = require('../models/gptModel');
const { formatDate, parseDate } = require('../helpers/gptHelper');
const axios = require('axios');

// Return a CSV string of sorted transactions
async function getSortedTransactions(userId, startDateStr, endDateStr) {
  try {
    const user = await User.findById(userId).populate('transactions');
    if (!user) {
      throw new Error('User not found');
    }

    let startDate, endDate;
    if (startDateStr) {
      startDate = parseDate(startDateStr);
    }
    if (endDateStr) {
      endDate = parseDate(endDateStr);
    }

    const filteredTransactions = user.transactions.filter((transaction) => {
      const transactionDate = new Date(transaction.date);
      if (startDate && endDate) {
        return transactionDate >= startDate && transactionDate <= endDate;
      } else if (startDate) {
        return transactionDate >= startDate;
      } else if (endDate) {
        return transactionDate <= endDate;
      } else {
        return true; // No date filters applied
      }
    });

    const sortedTransactions = filteredTransactions.sort(
      (a, b) => new Date(a.date) - new Date(b.date)
    );

    const csvTransactions = sortedTransactions
      .map(
        (transaction) =>
          `${formatDate(transaction.date)},${transaction.type},${
            transaction.category
          },${transaction.title},${transaction.transactionAmount}$`
      )
      .join('\n');

    const csvHeader = 'date(ddmmyy),type,category,title,transaction amount';
    const csvString = `${csvHeader}\n${csvTransactions}`;

    return csvString;
  } catch (error) {
    console.error(error);
    throw error;
  }
}

exports.getAllConversations = async (req, res) => {
  try {
    const userId = req.user._id;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 7;
    const skip = (page - 1) * limit;

    const conversations = await Conversation.find(
      { user: userId },
      '_id title createdAt'
    )
      .skip(skip)
      .limit(limit)
      .exec();

    const transformedConversations = conversations.map((conversation) => ({
      conversation_id: conversation._id,
      title: conversation.title,
      createdAt: conversation.createdAt,
    }));

    const totalConversations = await Conversation.countDocuments({
      user: userId,
    }).exec();
    const totalPages = Math.ceil(totalConversations / limit);

    res.json({
      conversations: transformedConversations,
      currentPage: page,
      totalPages,
      totalConversations,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.deleteConversation = async (req, res) => {
  try {
    const { conversationId } = req.params;
    const userId = req.user._id;

    const conversation = await Conversation.findOne({
      _id: conversationId,
      user: userId,
    });
    if (!conversation) {
      return res.status(404).send('Conversation not found');
    }

    await Conversation.deleteOne({ _id: conversationId });
    res.status(200).send('Deleted successfully');
  } catch (error) {
    console.error(error);
    res.status(500).send('Unable to delete conversation');
  }
};

exports.getConversationMessages = async (req, res) => {
  try {
    const { conversationId } = req.params;

    const conversation = await Conversation.findById(conversationId)
      .select('title settings messages')
      .populate('messages')
      .exec();

    if (!conversation) {
      return res.status(404).json({ message: 'Conversation not found' });
    }

    res.json({
      title: conversation.title,
      settings: conversation.settings,
      messages: conversation.messages,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.sendMainMessage = async (req, res) => {
  try {
    const userId = req.user._id;
    if (!userId) return res.status(404).send('User not found');
    if (!req.body.message) {
      return res.status(400).send('User message not found');
    }

    let conversation;
    if (req.body.conversation_id) {
      conversation = await Conversation.findOne({
        _id: req.body.conversation_id,
        user: userId,
      });
      if (!conversation) return res.status(404).send('Conversation not found');
    } else {
      // Create a new conversation if conversation_id is null or empty
      conversation = new Conversation({
        title: req.body.title,
        user: userId,
        messages: [],
        settings: {
          response_length: 'medium',
          temperature: 0.5,
        },
        createdAt: new Date(),
      });
    }
    // Append the new user message to the conversation
    const newMessage = { role: 'user', content: req.body.message };
    conversation.messages.push(newMessage);

    // Check if user requested a range of date
    let startDate, endDate;
    try {
      if (req.body.transaction_start_date) {
        const transactionStartDate = req.body.transaction_start_date;
        if (!transactionStartDate || !/^\d{6}$/.test(transactionStartDate)) {
          throw new Error('Invalid transaction start date format');
        }
        // startDate = parseDate(transactionStartDate);
        startDate = transactionStartDate;
      }
      if (req.body.transaction_end_date) {
        const transactionEndDate = req.body.transaction_end_date;
        if (!transactionEndDate || !/^\d{6}$/.test(transactionEndDate)) {
          throw new Error('Invalid transaction end date format');
        }
        endDate = transactionEndDate;
      }
    } catch (error) {
      console.error('Invalid date format:', error.message);
      return res
        .status(400)
        .json({ error: 'Invalid start_date or end_date format received' });
    }

    // Temporary message to include user's transactions as CSV string, so that GPT can understand user's financial data

    let transactionData = {
      role: 'user',
      content:
        'This is my transaction data in CSV format' +
        (await getSortedTransactions(userId, startDate, endDate)),
    };

    // Prepare the payload
    let response_length =
      req.body.settings?.response_length ||
      conversation.settings.response_length;
    let temperature =
      req.body.settings?.temperature || conversation.settings.temperature;
    const payload = {
      settings: {
        response_length: response_length,
        temperature: temperature,
        system_prompt:
          "Act as a Financial Assistant, you can only answer questions or requests related to Money only, if it is not related. Please DO NOT ANSWER, instead, reply with 'Please only ask Financial questions related only'",
        precaution:
          'REMEMBER: DO NOT ANSWER IF IT IS NOT RELATED TO MONEY, FINANCE, INVESTMENT, BANKING, OR ANYTHING RELATED, questions that are considered follow up to the above are allowed',
      },
      messages: [
        ...conversation.messages.slice(0, -1), // All elements except the last one
        transactionData, // The transaction data to inject
        conversation.messages[conversation.messages.length - 1], // The last element
      ],
    };
    // Send POST request to external GPT service
    let response;
    try {
      response = await axios.post(
        'http://127.0.0.1:8000/api/generate',
        payload
      );
    } catch (error) {
      // console.error('Error during axios request:', error);
      return res.status(500).send(`Error from the GPT Service.`);
    }

    let message = response.data.content;
    const conversationTitle = message.title;
    conversation.title = conversationTitle;

    const assistantMessage = {
      role: message.role,
      content: message.content,
    };
    conversation.messages.push(assistantMessage);

    // Save the updated conversation
    await conversation.save();

    const serverResponse = {
      conversationId: conversation.conversationId,
      title: message.title,
      content: message.content,
    };

    res.status(200).send(serverResponse);
  } catch (error) {
    console.error(error);
    res.status(500).send('Server error');
  }
};

async function getSuggestionPromptFromGPT(messages) {
  try {
    let payload_message = {
      role: 'user',
      content:
        'Send me an array of 4 strings [,,,,], containing follow up questions related to the given text. They ALL must be brief, short, and related to the questions! E.g. What about, How do I, etc...',
    };
    // Append the new user message to the payload
    messages.push(payload_message);

    // Prepare the payload
    const payload = {
      settings: {
        response_length: 'short',
        temperature: 0.2,
        system_prompt:
          'You are a prompt generator, generate 4 follow up questions based on the above text, they all should be brief and succint, and related to the above text. Remember to keep them related to the above text, BUT DO NOT GENERATE PROMPTS THAT IS RELATED TO THE USER PROMPTS (hint: they all are topics about FINANCIAL, MONEY, INVESTING, etc...). E.g. What about, How do I, etc...',
        precaution:
          'Remember! Only send me an array of 4 strings contaning follow up questions related to all of the above text (hint: they all are topics about FINANCIAL, MONEY, INVESTING, etc...).',
      },
      messages: messages,
    };

    // Send POST request to external GPT service
    let response;
    try {
      response = await axios.post(
        'http://127.0.0.1:8000/api/generate',
        payload
      );
    } catch (error) {
      // console.error('Error during axios request:', error);
      return res.status(500).send(`Error from the GPT Service.`);
    }

    let prompts;
    prompts = response.data.content.content;
    if (typeof prompts === 'string') {
      try {
        prompts = JSON.parse(prompts);
      } catch (e) {
        console.error('Error parsing prompts:', e.message); // Debugging line
        return {
          status: 'fail',
          content:
            'Internal Server Error. Unexpected array format generated, please try generating again.',
        };
      }
    }
    return {
      status: 'success',
      content: prompts,
    };
  } catch (error) {
    console.error(error);
    return {
      status: 'fail',
      content:
        'Internal Server Error, Unexpected array format, please try requesting again.',
    };
  }
}

exports.getSuggestionPrompt = async (req, res) => {
  try {
    const userId = req.user._id;
    // const user = await User.findById(req.params.userId);
    if (!userId) return res.status(404).send('User not found');

    // Check for request body for type
    if (!req.body.type) {
      return res.status(400).send('Prompt type is required');
    }
    if (
      !['general', 'budget', 'transactions', 'goals'].includes(req.body.type)
    ) {
      return res.status(400).send('Invalid prompt type');
    }
    let results;
    // If prompt type is general, check for req.body.conversation_id.
    // If conversation_id is empty, return hard-coded prompts,
    // otherwise, return prompts generated by GPT based on the conversation.
    if (req.body.type === 'general') {
      if (!req.body.conversation_id || req.body.conversation_id === '') {
        return res.status(200).json({
          prompts: [
            'What are my top three financial goals for the next six months, and how am I progressing towards them?',
            'How much do I need to save each month to reach my emergency fund target by the end of the year?',
            'Are my current spending habits aligned with my long-term savings goals, such as buying a house or retirement?',
            'What are the top three financial goals for the next six months, and how am I progressing towards them?',
          ],
        });
      } else {
        // Find the conversation for the given user
        const conversation = await Conversation.findOne({
          _id: req.body.conversation_id,
          user: userId,
        });
        if (!conversation) {
          return res.status(404).send('Conversation not found');
        }
        results = await getSuggestionPromptFromGPT(conversation.messages);
      }
    } else if (['budget', 'transactions', 'goals'].includes(req.body.type)) {
      // Check if small conversation already exists
      let small_conversation;
      small_conversation = await SmallConversation.findOne({
        user: userId,
      });
      if (!small_conversation || small_conversation.messages.length === 0) {
        // If no small conversation exists, check for params to return an array of 4 prompts
        // Check if prompt Type is either 'budget', 'transactions', or 'goals'
        switch (req.body.type) {
          case 'budget':
            return res.status(200).json({
              prompts: ['Help me save the budget.', 'Hoho', 'Hehe', 'Haha'],
            });
          case 'transactions':
            return res.status(200).json({
              prompts: ['Haha', 'Hoho', 'Hehe', 'Hihi'],
            });
          case 'goals':
            return res.status(200).json({
              prompts: [
                'What are my top three financial goals for the next six months, and how am I progressing towards them?',
                'How much do I need to save each month to reach my emergency fund target by the end of the year?',
                'Are my current spending habits aligned with my long-term savings goals, such as buying a house or retirement?',
                'What are my top three financial goals for the next six months, and how am I progressing towards them?',
              ],
            });
          default:
            return res.status(400).send('Invalid prompt type');
        }
      }

      // If small conversation exists, generate an array of 4 prompts based on small conversation messages
      results = await getSuggestionPromptFromGPT(small_conversation.messages);
    }

    // Check if the results are successful
    if (results.status === 'fail') {
      return res.status(500).send(results.content);
    }

    // Return the prompts
    const prompts = results.content;
    if (!prompts || prompts.length === 0) {
      return res
        .status(500)
        .send('Unable to generate prompts, please try  generating again.');
    }
    serverResponse = {
      prompts: prompts,
    };
    res.status(200).send(serverResponse);
  } catch (error) {
    console.error(error);
    res.status(500).send('Server error');
  }
};

// Small chat
exports.getSmallMessages = async (req, res) => {
  try {
    const userId = req.user._id;
    // const
    if (!userId) return res.status(404).send('User not found');

    // Check if small conversation already exists
    let small_conversation;
    small_conversation = await SmallConversation.findOne({
      user: userId,
    });

    if (!small_conversation) {
      // Create a new small conversation
      small_conversation = new SmallConversation({
        user: userId,
        messages: [],
        createdAt: new Date(),
      });
      return res.status(200).send([]);
    } else {
      return res.status(200).send(small_conversation.messages);
    }
  } catch (error) {
    console.error(error);
    res.status(500).send('Server error');
  }
};

exports.sendSmallMessage = async (req, res) => {
  try {
    const userId = req.user._id;
    if (!userId) return res.status(404).send('User not found');

    // Check for request body if it includes the prompt key.
    if (!req.body.prompt) {
      return res.status(400).send('Prompt is required');
    }

    // Check if small conversation already exists
    let small_conversation;
    small_conversation = await SmallConversation.findOne({
      user: userId,
    });

    if (!small_conversation) {
      // Create a new small conversation
      small_conversation = new SmallConversation({
        user: userId,
        messages: [],
        createdAt: new Date(),
      });
    }

    // Append the new user message to the conversation
    const newMessage = { role: 'user', content: req.body.prompt };
    small_conversation.messages.push(newMessage);

    // Prepare the payload
    const payload = {
      settings: {
        response_length: 'short',
        temperature: 0.5,
        system_prompt:
          "Act as a Financial Assistant, you can only answer questions or requests related to Money only, if it is not related. Please DO NOT ANSWER, instead, reply with 'Please only ask Financial questions related only'",
        precaution:
          'REMEMBER: DO NOT ANSWER IF IT IS NOT RELATED TO MONEY, FINANCE, INVESTMENT, BANKING, OR ANYTHING RELATED',
      },
      messages: [...small_conversation.messages],
    };

    // Send POST request to external GPT service
    let response;
    try {
      response = await axios.post(
        'http://127.0.0.1:8000/api/generate',
        payload
      );
    } catch (error) {
      // console.error('Error during axios request:', error);
      return res.status(500).send(`Error from the GPT Service.`);
    }

    // Update the title
    title = response.data.content.title;
    small_conversation.title = title;

    // Push the AI message to the conversation
    message = response.data.content;

    const assistantMessage = {
      role: message.role,
      content: message.content,
    };
    small_conversation.messages.push(assistantMessage);

    // Save the updated conversation
    await small_conversation.save();

    serverResponse = {
      content: message.content,
    };
    res.status(200).send(serverResponse);
  } catch (error) {
    console.error(error);
    res.status(500).send('Server error');
  }
};

exports.transitSmallConversation = async (req, res) => {
  try {
    // Find the small conversation for the given user
    const userId = req.user._id;
    // const user = await User.findById(req.params.userId);
    if (!userId) return res.status(404).send('User not found');

    const small_conversation = await SmallConversation.findOne({
      user: userId,
    });
    if (!small_conversation) {
      return res.status(404).send('Small conversation not found for the user');
    }

    // Create a new conversation using the data from the small conversation
    const newConversation = new Conversation({
      user: small_conversation.user,
      title: small_conversation.title, // Default title or you can set it based on your requirements
      createdAt: small_conversation.createdAt,
      messages: small_conversation.messages,
      settings: {
        response_length: 'short',
        temperature: 0.5,
      },
    });

    // Save the new conversation to the database
    await newConversation.save();

    // Delete the small conversation from the database
    await SmallConversation.deleteOne({ _id: small_conversation._id });

    console.log('Transitioned to main AI chat successfully');
    res.status(200).send('Sent to main AI chat');
  } catch (error) {
    console.error(error);
    if (error.message === 'Small conversation not found for the user') {
      return res
        .status(404)
        .send('Small conversation not found, could be already deleted?');
    }
    res.status(500).send('Could not send to main AI chat');
  }
};

exports.deleteSmallConversation = async (req, res) => {
  try {
    // Find the small conversation for the given user
    const userId = req.user._id;
    // const user = await User.findById(req.params.userId);
    if (!userId) return res.status(404).send('User not found');

    const small_conversation = await SmallConversation.findOne({
      user: userId,
    });
    if (!small_conversation) {
      throw new Error('Small conversation not found for the user');
    }

    // Delete the small conversation from the database
    await SmallConversation.deleteOne({ _id: small_conversation._id });

    console.log('Deleted small conversation successfully');
    res.status(200).send('Deleted successfully');
  } catch (error) {
    console.error(error);
    if (error.message === 'Small conversation not found for the user') {
      return res
        .status(404)
        .send('Small conversation not found, could be already deleted?');
    }
    res.status(500).send('Could not delete');
  }
};
