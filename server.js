const mongoose = require('mongoose');
const app = require('./app');

// Hard-coded environment variables
const DATABASE = 'mongodb+srv://team7:1234@cluster0.qayvklq.mongodb.net/';
const DATABASE_PASSWORD = '1234';
const PORT = 3000;

// Replace placeholder with actual password
const DB = DATABASE.replace('1234', DATABASE_PASSWORD);

// Connect to MongoDB
mongoose
  .connect(DB)
  .then(() => console.log('DB connection successful!'))
  .catch(err => console.error('DB connection error:', err));

// Start the server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
