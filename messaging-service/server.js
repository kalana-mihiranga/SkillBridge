const app = require('./app');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

/**
 * Ensure a thread exists for a booking
 * POST /threads { bookingId }
 * -> { id, bookingId, createdAt }
 */
app.post('/threads', async (req, res) => {
  const { bookingId } = req.body || {};
  if (!bookingId) return res.status(400).json({ error: 'bookingId required' });
  try {
    const existing = await prisma.thread.findUnique({ where: { bookingId } });
    if (existing) return res.json(existing);
    const t = await prisma.thread.create({ data: { bookingId } });
    res.status(201).json(t);
  } catch (e) { res.status(500).json({ error: String(e.message||e) }); }
});

/**
 * Get thread by bookingId
 * GET /threads/by-booking/:bookingId
 */
app.get('/threads/by-booking/:bookingId', async (req, res) => {
  const t = await prisma.thread.findUnique({ where: { bookingId: req.params.bookingId } });
  if (!t) return res.status(404).json({ error: 'not found' });
  res.json(t);
});

/**
 * List messages
 * GET /threads/:threadId/messages
 */
app.get('/threads/:threadId/messages', async (req, res) => {
  const messages = await prisma.message.findMany({
    where: { threadId: req.params.threadId },
    orderBy: { createdAt: 'asc' }
  });
  res.json({ total: messages.length, messages });
});

/**
 * Send message
 * POST /threads/:threadId/messages { senderId, senderRole, body }
 */
app.post('/threads/:threadId/messages', async (req, res) => {
  const { senderId, senderRole, body } = req.body || {};
  if (!senderId || !senderRole || !body) return res.status(400).json({ error: 'senderId, senderRole, body required' });
  try {
    const msg = await prisma.message.create({
      data: { threadId: req.params.threadId, senderId, senderRole, body }
    });
    res.status(201).json(msg);
  } catch (e) { res.status(500).json({ error: String(e.message||e) }); }
});

const port = process.env.PORT || 4104;
app.listen(port, () => console.log(`messaging service on :${port}`));

