const mongoose = require('mongoose');
const dotenv = require('dotenv');

// Load environment variables from .env file
dotenv.config({ path: './config.env' });
const app = require('./app');

<<<<<<< Updated upstream
=======
require('./models/userModel');
require('./models/promptModel');
require('./models/transactionModel'); 
require('./models/goalModel'); 
// Hard-coded environment variables
const DATABASE = 'mongodb+srv://team7:1234@cluster0.qayvklq.mongodb.net/';
const DATABASE_PASSWORD = '1234';
const PORT = 3000;

// Replace placeholder with actual password
const DB = DATABASE.replace('1234', DATABASE_PASSWORD);

>>>>>>> Stashed changes
// Connect to MongoDB
const DB = process.env.DATABASE.replace(
  '1234',
  process.env.DATABASE_PASSWORD
);

mongoose
  .connect(DB, {
    useNewUrlParser: true,
    useCreateIndex: true,
    useFindAndModify: false
  })
  .then(() => console.log('DB connection successful!'));

// Start the server
const port = process.env.PORT || 3000;
app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});
