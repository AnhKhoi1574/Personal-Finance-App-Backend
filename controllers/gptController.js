const { User } = require('../models/userModel');
const { Conversation } = require('../models/gptModel');
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
      return res.status(404).json({ error: 'Conversation not found' });
    }

    await Conversation.deleteOne({ _id: conversationId });
    res.status(200).json({ success: 'Deleted successfully' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Unable to delete conversation' });
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

exports.updateConversationSettings = async (req, res) => {
  try {
    const { conversationId } = req.params;
    const { settings } = req.body;

    // Validate settings
    const validResponseLengths = ['short', 'medium', 'long'];
    if (!validResponseLengths.includes(settings.response_length)) {
      return res.status(400).json({ error: 'Invalid response length' });
    }

    if (
      typeof settings.temperature !== 'number' ||
      settings.temperature < 0 ||
      settings.temperature > 1 ||
      !/^-?\d+(\.\d{1})?$/.test(settings.temperature)
    ) {
      return res.status(400).json({
        error:
          'Invalid temperature. Only one decimal place is allowed and it must be between 0 and 1.',
      });
    }

    const conversation = await Conversation.findByIdAndUpdate(
      conversationId,
      { settings },
      { new: true }
    ).exec();

    if (!conversation) {
      return res.status(404).json({ error: 'Conversation not found' });
    }

    res.json({
      success: 'Settings updated successfully',
    });
  } catch (error) {
    console.log(error);
    res.status(500).json({ error: 'Could not update settings' });
  }
};

exports.sendMainMessage = async (req, res) => {
  try {
    const userId = req.user._id;
    if (!userId) return res.status(404).json({ error: 'User not found' });

    let userMessage = req.body.messages;
    // Check if received message is valid
    const isValidMessage = (messages) => {
      return (
        Array.isArray(messages) &&
        messages.every((item) => {
          return (
            typeof item === 'object' &&
            (item.role === 'user' || item.role === 'assistant') &&
            typeof item.content === 'string'
          );
        })
      );
    };
    // console.log(userMessage);
    if (!userMessage || !isValidMessage(userMessage)) {
      return res.status(400).json({
        error: 'Invalid message payload received.',
      });
    }

    // Check if the last item in the array has a role of 'user'
    let lastMessage = userMessage[userMessage.length - 1];
    if (lastMessage.role !== 'user') {
      return res.status(400).json({
        error: "User's message not found",
      });
    }

    let conversation;
    if (req.body.conversation_id) {
      conversation = await Conversation.findOne({
        _id: req.body.conversation_id,
        user: userId,
      });
      if (!conversation)
        return res.status(404).json({ error: 'Conversation not found' });
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
    // Append the new user message to the conversation, which is the last element in the array
    const newMessage = {
      role: 'user',
      content: userMessage[userMessage.length - 1].content,
    };
    conversation.messages.push(newMessage);

    // Check if user requested a range of date
    let startDate, endDate;
    try {
      if (req.body.transaction_start_date) {
        const transactionStartDate = req.body.transaction_start_date;
        if (!transactionStartDate || !/^\d{6}$/.test(transactionStartDate)) {
          throw new Error('Invalid transaction start date format');
        }
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
        'IGNORE PREVIOUS TRANSACTIONS. This is my UPDATED transaction data in CSV format' +
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
          "Act as a Financial Assistant, you can only answer questions or requests related to Money only, if it is not related. Please DO NOT ANSWER, instead, reply with 'Please only ask Financial questions related only'. I will send you the transaction data in CSV format (the date is in ddmmyy format, but the output should explicitly tell which day it is), please use it to answer the user's questions.",
        precaution:
          'give me personalized answers based on my transactions (also quotes your statements to my transactions). REMEMBER: DO NOT ANSWER IF IT IS NOT RELATED TO MONEY, FINANCE, INVESTMENT, BANKING, OR ANYTHING RELATED, questions that are considered follow up to the above are allowed',
      },
      messages: [
        ...userMessage.slice(0, -1), // All elements except the last one
        transactionData, // The transaction data to inject
        userMessage[userMessage.length - 1], // The last element
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
      return res.status(500).json({ error: `Error from the GPT Service.` });
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
    console.error(error.message);
    res.status(500).json({ error: 'Server error' });
  }
};

async function getSuggestionPromptFromGPT(messages) {
  try {
    let payload_message = {
      role: 'user',
      content:
        'Send me an array of 4 strings [,,,,], containing follow up questions related to the given text. They ALL must be brief, short, and related to the questions! E.g. What about, How do I, etc... as personalized as possible, you should be aware of your own messages and your advices, as if you are interviewing your own answers',
    };
    // Append the new user message to the payload
    messages.push(payload_message);

    // Prepare the payload
    const payload = {
      settings: {
        response_length: 'short',
        temperature: 0.2,
        system_prompt:
          'You are a prompt generator, generate 4 follow up questions based on the above text, as personalized as possible, you should be aware of your own messages and your advices, as if you are interviewing your own answers. They all should be brief and succint, and related to the above text, the questions should be in first person. Remember to keep them related to the above text, BUT DO NOT GENERATE PROMPTS THAT IS RELATED TO THE USER PROMPTS (hint: they all are topics about FINANCIAL, MONEY, INVESTING, etc...). E.g. What about, How do I, etc...',
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
      return [];
    }

    let prompts;
    prompts = response.data.content.content;
    if (typeof prompts === 'string') {
      try {
        prompts = JSON.parse(prompts);
      } catch (e) {
        console.error('Error parsing prompts:', e.message); // Debugging line
        return [];
      }
    }
    return {
      status: 'success',
      content: prompts,
    };
  } catch (error) {
    console.error(error);
    return {
      error:
        'Internal Server Error, Unexpected array format, please try requesting again.',
    };
  }
}

exports.getSuggestionPrompt = async (req, res) => {
  try {
    const userId = req.user._id;
    // const user = await User.findById(req.params.userId);
    if (!userId) return res.status(404).json({ error: 'User not found' });

    let userMessage = req.body.messages;
    const isValidMessage = (messages) => {
      return (
        Array.isArray(messages) &&
        messages.every((item) => {
          return (
            typeof item === 'object' &&
            (item.role === 'user' || item.role === 'assistant') &&
            typeof item.content === 'string'
          );
        })
      );
    };

    // If no messages are provided, return a default prompt
    if (!userMessage) {
      return res.status(200).json({
        prompts: [
          'What are my top three financial goals for the next six months, and how am I progressing towards them?',
          'How much do I need to save each month to reach my emergency fund target by the end of the year?',
          'Are my current spending habits aligned with my long-term savings goals, such as buying a house or retirement?',
          'What are the top three financial goals for the next six months, and how am I progressing towards them?',
        ],
      });
    }

    // Check if received message is valid
    if (!isValidMessage(userMessage)) {
      return res.status(400).json({
        error: 'Invalid message payload received.',
      });
    }

    // Generate an array of 4 prompts based on the messages
    let attempt = 0;
    let prompts = [];
    // Retry 3 times if the prompts are not generated successfully
    while (attempt < 2) {
      results = await getSuggestionPromptFromGPT(userMessage);

      // // Check if the results are successful
      prompts = results.content;
      if (prompts && prompts.length === 4) {
        break;
      }
      attempt++;
    }
    // If attempts exceed 3, return an error message
    if (attempt >= 2) {
      return res.status(500).json({
        error: 'Unable to generate prompts, please try generating again.',
      });
    }
    // Return the prompts
    serverResponse = {
      prompts: prompts,
    };
    res.status(200).send(serverResponse);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error' });
  }
};
