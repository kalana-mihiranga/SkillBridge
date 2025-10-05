
// users-service/app.js
require('dotenv').config();
const express = require('express');
const morgan = require('morgan');
const cors = require('cors');

const app = express();
app.use(morgan('dev'));
// users-service/app.js

app.use(cors({
  origin: 'http://localhost:5173',
  methods: ['GET','POST','PATCH','OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json());

app.get('/health', (_req, res) => res.json({ ok: true, service: 'users' }));

module.exports = app;
