const mongoose = require('mongoose');
const app = require('./app');

// Connect to MongoDB
const DB = 'mongodb+srv://team7:1234@cluster0.qayvklq.mongodb.net/';

mongoose
  .connect(DB)
  .then(() => console.log('DB connection successful!'))
  .catch((err) => console.error('DB connection error:', err));

// Start the server
const port = 3000;
app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});
