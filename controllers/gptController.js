const { Conversation } = require('../models/gptModel');
const {
  getSortedTransactions,
  getSavingDetails,
} = require('../helpers/gptHelper');
const axios = require('axios');

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

    // Prepare the data for the payload
    // Get current date
    let currentDate = new Date().toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });

    // Get current transactions
    let sortedTransactions = await getSortedTransactions(
      userId,
      startDate,
      endDate
    );

    // Get saving details
    let savingDetails = await getSavingDetails(userId);
    let savingDetailsString = '';
    if (savingDetails != null) {
      savingDetailsString =
        "The saving goal's name: " +
        savingDetails.name +
        "; goal's current amount (money accumulated in the goal): " +
        savingDetails.currentAmount +
        "; goal's target amount (the target that needs to be achieved): " +
        savingDetails.targetAmount +
        "; the goal's target date (I want to complete my saving goal before this date): " +
        savingDetails.targetDate;
      if (savingDetails.isAutoSavingEnabled === true) {
        savingDetailsString +=
          '; the percentage that is automatically deducted from my income when I add them ' +
          savingDetails.autoSavingPercentage +
          '.';
      } else {
        savingDetailsString += '.';
      }
    }

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
          "Act as a Financial Assistant, you will give me answers to any questions or requests. There are important notes you should be aware of before answering:\n- The question or requests should only be related to money, investing, mortgage, etc... anything finance-related. If the question/request considerably goes out of these scopes, refuse to reply.\n- Your answer should be in correlation of these things: the current date, the transactions data (in CSV format), and the saving goal's name/amount. You should be aware of them to give a personalized answer, while also quoting your statements to the data given (e.g. Transactions details, etc). Be sure to always check the given data as they will be updated occasionally, keeping the balance between the relevancy of the data and the previous responses.\n" +
          'The current date is: ' +
          currentDate +
          '\n' +
          savingDetailsString +
          'The transactions data is:\n' +
          sortedTransactions,
      },
      messages: userMessage,
    };

    // Send POST request to external GPT service with streaming response
    const response = await axios.post(
      'http://127.0.0.1:8000/api/stream',
      payload,
      {
        responseType: 'stream',
      }
    );

    // Initialize variables to store the concatenated stream and title
    let concatenatedStream = '';
    let title = '';
    response.data.on('data', (chunk) => {
      const chunkString = chunk.toString();
      const chunkJson = JSON.parse(chunkString);

      // Extract the content and concatenate it
      if (chunkJson.content && chunkJson.content.content) {
        concatenatedStream += chunkJson.content.content;
      }

      // Fetch the title from the first stream response
      if (!title && chunkJson.content && chunkJson.content.title) {
        title = chunkJson.content.title;
      }

      res.write(chunkString);
    });

    response.data.on('end', async () => {
      res.end();

      // Create the assistantMessage object
      const assistantMessage = {
        role: 'assistant',
        content: concatenatedStream,
      };

      // Push the assistantMessage to the conversation messages
      conversation.messages.push(assistantMessage);

      // Update the conversation title if it was fetched
      if (title) {
        conversation.title = title;
      }

      // Save the conversation
      await conversation.save();
    });

    response.data.on('error', (error) => {
      console.error('Error in streaming response:', error.message);
      res
        .status(500)
        .json({ error: 'Error in streaming response from GPT Service.' });
    });
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
