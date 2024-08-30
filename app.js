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
const gptRoutes = require('./routes/gptRoutes');

// Use routes
app.use('/api/', authRoutes);
app.use('/api/profile', userRoutes);
app.use('/api/transactions', transactionRoutes);
app.use('/api/saving', savingRoutes);
app.use('/api/budgets', budgetRoutes);
app.use('/api/gpt', gptRoutes);

module.exports = app;
