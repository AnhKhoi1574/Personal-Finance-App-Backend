const mongoose = require('mongoose');
const app = require('../app');

// Connect to MongoDB
const DB = 'mongodb+srv://team7:1234@cluster0.qayvklq.mongodb.net/';

mongoose
  .connect(DB)
  .catch((err) => console.error('DB connection error:', err));

// Export the server instance for testing
const port = 3001;
const server = app.listen(port, () => {});


module.exports = server;