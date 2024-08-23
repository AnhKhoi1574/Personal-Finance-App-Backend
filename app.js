const express = require('express');
const mongoose = require('mongoose');
const bodyParser = require('body-parser');
const cors = require('cors');
const app = express();

// Middleware setup
app.use(cors());
app.use(bodyParser.json({ limit: '10mb' })); // Increase the limit

// Import routes
const authRoutes = require('./routes/authRoutes');
const userRoutes = require('./routes/userRoutes');
const transactionRoutes = require('./routes/transactionRoutes');
const savingRoutes = require('./routes/savingRoutes');
const budgetRoutes = require('./routes/budgetRoutes');

// Use routes
app.use('/api/', authRoutes);
app.use('/api/profile', userRoutes);
app.use('/api/transactions', transactionRoutes);
app.use('/api/savings', savingRoutes);
app.use('/api/budgets', budgetRoutes);

module.exports = app;
