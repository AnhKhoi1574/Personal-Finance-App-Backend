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

module.exports = { getSortedTransactions, getSavingDetails };
