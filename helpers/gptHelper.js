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