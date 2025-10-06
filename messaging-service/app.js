require('dotenv').config();
const express = require('express');
const morgan = require('morgan');
const cors = require('cors');

const app = express();
app.use(morgan('dev'));
app.use(cors());
app.use(express.json());
app.get('/health', (_req, res) => res.json({ ok: true, service: 'messaging' }));
module.exports = app;

