const axios = require('axios');
const {
  createTransactionHelper,
  updateTransactionHelper,
  deleteTransactionHelper,
} = require('../helpers/transactionHelper');
const { User } = require('../models/userModel');

function formatDate(date) {
  const d = new Date(date);
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0'); // Months are zero-based
  const year = String(d.getFullYear()).slice(-2); // Get last two digits of the year
  return `${day}${month}${year}`;
}

// Helper function to parse date from ddmmyy format
function parseDate(dateStr) {
  const day = dateStr.slice(0, 2);
  const month = dateStr.slice(2, 4) - 1; // Months are zero-based
  const year = '20' + dateStr.slice(4, 6); // Assuming 21st century
  const date = new Date(year, month, day);

  // Check if the date is valid
  if (isNaN(date.getTime())) {
    throw new Error('Invalid date format');
  }

  return date;
}

module.exports = { formatDate, parseDate };

async function getSortedTransactions(
  userId,
  startDateStr,
  endDateStr,
  fetchId
) {
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

    let filteredTransactions = user.transactions;

    if (startDate || endDate) {
      filteredTransactions = filteredTransactions.filter((transaction) => {
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
    }

    const sortedTransactions = filteredTransactions.sort(
      (a, b) => new Date(a.date) - new Date(b.date)
    );

    const csvHeader = fetchId
      ? 'id,date(ddmmyy-hhmm),type,category,title,transaction amount'
      : 'date(ddmmyy-hhmm),type,category,title,transaction amount';

    const formatDate = (date) => {
      const d = new Date(date);
      const dd = String(d.getDate()).padStart(2, '0');
      const mm = String(d.getMonth() + 1).padStart(2, '0'); // Months are zero-based
      const yy = String(d.getFullYear()).slice(-2);
      const hh = String(d.getHours()).padStart(2, '0');
      const min = String(d.getMinutes()).padStart(2, '0');
      return `${dd}${mm}${yy}-${hh}${min}`;
    };

    const csvTransactions = sortedTransactions
      .map((transaction) => {
        const formattedDate = formatDate(transaction.date);
        return fetchId
          ? `${transaction._id},${formattedDate},${transaction.type},${transaction.category},${transaction.title},${transaction.transactionAmount}`
          : `${formattedDate},${transaction.type},${transaction.category},${transaction.title},${transaction.transactionAmount}`;
      })
      .join('\n');

    const csvString = `${csvHeader}\n${csvTransactions}`;

    return csvString;
  } catch (error) {
    console.error(error);
    throw error;
  }
}

async function getSavingDetails(userId) {
  try {
    // Find the user by ID and select only the saving field
    const user = await User.findById(userId).select('saving');

    if (!user) {
      return null;
    }

    if (!user.saving) {
      return null;
    }

    // Return saving
    function formatDate(dateString) {
      const date = new Date(dateString);
      return date.toLocaleDateString('en-GB', {
        year: 'numeric',
        month: 'short',
        day: '2-digit',
      });
    }

    return {
      name: user.saving.goalName,
      currentAmount: user.saving.currentAmount,
      targetAmount: user.saving.targetAmount,
      targetDate: formatDate(user.saving.targetDate),
      isAutoSavingEnabled: user.saving.isAutoSavingEnabled,
      autoSavingPercentage: user.saving.autoSavingPercentage,
    };
  } catch (error) {
    console.log(error);
    return null;
  }
}

async function gptAddTransaction(userId, messages) {
  try {
    // Get array of JSONs from GPT
    // Get current date and time
    let currentDateAndTime = new Date().toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
    const payload = {
      settings: {
        response_length: 'long',
        temperature: 0.4,
        system_prompt:
          'You are a JSON generator, I will give you details about my transactions, you will give me an array of JSON in plaintext, starts with the sqaure bracket only [. Your job is to identify exactly what the user is trying to add, and fill in the missing data appropriately (e.g. deciding which category, or which transaction title is descriptive, calculate the amount yourself if I do not tell you explicitly), then provide an array of JSONs containing:\n- date(string): in this example format "2024-09-13T01:20" (year-month-date-hour-minute), if time is not specified, always assume. Note that currently its' +
          currentDateAndTime +
          'at 3:04AM\n- type(string): either "income" or "expense"\n- category(string): if type is "income" then must be only "Income"; if type is "expense" then must be one of these: "Household", "Shopping", "Food", "Utilities", "Transportation", "Others" (category must capitalize the begin of char).\n- transactionAmount(float): the amount of the item, in float or integer e.g. 10 or 10.5\n- title(string): the descriptive title of the transaction (do not make it too generic, but also do not hallucinate): e.g. Groceries (items...), Movie ticket for <film name>, A date, etc\n\nExample:\n-Input: I went to the groceries store yesterday to grab some chickens after gym, it costed me 20$ for 10 thighs of chickens. And I got fined 100$ by a police for running a red light. Luckily, my boss gave me rewards for being so nice to him, he gave me 150$.\n-Your Output (Exactly as followed without any format, plaintext):\n[{"date": <you decide>, "type": "expense","category": "Food","transactionAmount": 20,"title": <You decide>}, {<2nd item>}, {<3rd item>}]. NOTE: If you do not understand, return empty array [].',
      },
      messages: messages,
    };

    let response;
    let json_data;
    response = await axios.post('http://127.0.0.1:8000/api/generate', payload);
    try {
      json_data = await JSON.parse(response.data.content.content);
    } catch (error) {
      console.log(error);
      return false;
    }
    // Sample JSON
    // Check if the JSON received is valid
    const isValid =
      Array.isArray(json_data) &&
      json_data.every(
        (item) =>
          typeof item.date === 'string' &&
          typeof item.type === 'string' &&
          typeof item.category === 'string' &&
          typeof item.transactionAmount === 'number' &&
          typeof item.title === 'string'
      );

    if (!isValid) {
      // console.log('Failed check!');
      return false;
    }

    for (const transaction of json_data) {
      // Add the transaction to the database
      createTransactionHelper(
        userId,
        transaction.date,
        transaction.type,
        transaction.transactionAmount,
        transaction.category,
        transaction.title
      );
    }
    return response.data.content.content;
  } catch (error) {
    console.log(error);
    return false;
  }
}

async function gptUpdateTransaction(userId, messages, startDate, endDate) {
  try {
    let currentDateAndTime = new Date().toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });

    let sortedTransactions = await getSortedTransactions(
      userId,
      startDate,
      endDate,
      true
    );

    const payload = {
      settings: {
        response_length: 'long',
        temperature: 0.4,
        system_prompt:
          'You are a JSON generator, I will give you a CSV of transactions, you will give me an array of JSON in plaintext, starts with the sqaure bracket only [. your job is to lookup for the ID in that CSV data, and identify what transaction I want to update the info of, then based on my request, change the data accordingly, then generate an array of JSON in plaintext (IMPORTANT: no extra messages, symbol) so I can use my API to update it, the format:\n- id (string): got by looking up the CSV data (only this it fetched from the CSV, all the below fields are up to you to decide, must be based on the users request)\n- date (string): in this format "2024-09-13T01:20" (year-month-date-hour-minute), if time is not specified, always assume. Note that currently its' +
          currentDateAndTime +
          '\n- type (string): either "income" or "expense"\n- category (string): stay the same, unless specified otheriwse -> Change accordingly, note that if type is "income" then must be only "Income"; if type is "expense" then must be one of these: "Household", "Shopping", "Food", "Utilities", "Transportation", "Others" (category must capitalize the begin of char).\n- transactionAmount (float): stay the same, unless specified otherwise, the amount of the item, in float or integer e.g. 10 or 10.5\n- title (string): stay the SAME, unless explicitly specified otherwise the descriptive title of the transaction (do not make it too generic, but also do not hallucinate): e.g. Groceries (items...), Movie ticket for <film name>, A date, etc\n\nImportant Example:\nUser: /create I went to the club the other day for 30$\nYou: Done! I have added 1 entries to your account: Expenses: 13th September 2024: Club party, 30$\nUser: Sorry, I meant 35$\nYour exact output: [{"id": <id got from CSV>, "type": "expense", "category": "others", "transactionAmount": 35, "title": "Club party", "date": "2024-09-13T01:20"}]\n\nNOTE: IF NO TRANSACTION IS FOUND THEN return empty array [].\n\nMy CSV transactions (date is formatted ddmmyy-hhmm): ' +
          sortedTransactions +
          '\n\nREMEMBER your response format: [{}]',
      },
      messages: messages,
    };

    let json_data;
    let response;
    response = await axios.post('http://127.0.0.1:8000/api/generate', payload);
    try {
      json_data = await JSON.parse(response.data.content.content);
    } catch (error) {
      console.log(error);
      return false;
    }
    // Check if the JSON received is valid
    const isValid =
      Array.isArray(json_data) &&
      json_data.every(
        (item) =>
          typeof item.id === 'string' &&
          typeof item.date === 'string' &&
          typeof item.type === 'string' &&
          typeof item.category === 'string' &&
          typeof item.transactionAmount === 'number' &&
          typeof item.title === 'string'
      );

    if (!isValid) {
      // console.log('Failed check!');
      return false;
    }
    // Add the transaction to the database
    for (const transaction of json_data) {
      // Add the transaction to the database
      await updateTransactionHelper(
        userId,
        transaction.id,
        transaction.date,
        transaction.type,
        transaction.category,
        transaction.transactionAmount,
        transaction.title
      );
    }

    return response.data.content.content;
  } catch (error) {
    console.log(error);
    return false;
  }
}

async function gptDeleteTransaction(userId, messages, startDate, endDate) {
  try {
    let currentDateAndTime = new Date().toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });

    let sortedTransactions = await getSortedTransactions(
      userId,
      startDate,
      endDate,
      true
    );

    const payload = {
      settings: {
        response_length: 'long',
        temperature: 0.4,
        system_prompt:
          'You are a JSON generator, I will give you a CSV of transactions, you will give me an array of JSON in plaintext, starts with the sqaure bracket only [. Your job is to lookup for the ID in that CSV data, and give me the ID of the transaction I want to delete the info from, then generate an array of JSON in plaintext (IMPORTANT: no extra messages, symbol) so I can use my API to delete it. Note that currently its ' +
          currentDateAndTime +
          ' the format:\n- id (string): got by looking up the CSV data\n- transactionAmount (float): say how much it is\n- date (string): in this format dd-mm-yy (e.g. 10 September 2024)\n- title (string): say the title\n\nImportant Example:\nUser: /create I went to the club the other day for 30$\nYou: Done! I have added 1 entries to your account: Expenses: 13th September 2024: Club party, 30$\nUser: Sorry, I made a mistake, please delete it\nYour exact output: [{"id": <id got from CSV>, "date": "23 September 2024", "title": <title>, "transactionAmount": <amount>}]\n\nNOTE: IF NO TRANSACTION IS FOUND THEN return empty array [].\n\nMy CSV transactions (date is formatted ddmmyy-hhmm): ' +
          sortedTransactions +
          '\n\nREMEMBER your response format: [{}]',
      },
      messages: messages,
    };

    let json_data;
    let response;
    response = await axios.post('http://127.0.0.1:8000/api/generate', payload);
    try {
      json_data = await JSON.parse(response.data.content.content);
    } catch (error) {
      console.log(error);
      return false;
    }

    // Check if the JSON received is valid
    const isValid =
      Array.isArray(json_data) &&
      json_data.every((item) => typeof item.id === 'string');

    if (!isValid) {
      // console.log('Failed check!');
      return false;
    }
    // Add the transaction to the database
    for (const transaction of json_data) {
      // Add the transaction to the database
      await deleteTransactionHelper(userId, transaction.id);
    }

    return response.data.content.content;
  } catch (error) {
    console.log(error);
    return false;
  }
}

module.exports = {
  getSortedTransactions,
  getSavingDetails,
  gptAddTransaction,
  gptUpdateTransaction,
  gptDeleteTransaction,
};
