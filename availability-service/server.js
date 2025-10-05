// availability-service/server.js
const app = require('./app');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

/**
 * POST /availability/slots
 * Mentor publishes slots:
 * body: { mentorId: string, slots: [{start, end}, ...] }  (ISO timestamps)
 */
app.post('/availability/slots', async (req, res) => {
  try {
    const { mentorId, slots = [] } = req.body || {};
    if (!mentorId || !Array.isArray(slots) || slots.length === 0) {
      return res.status(400).json({ error: 'mentorId and slots[] required' });
    }

    // Basic validation: end > start
    const data = slots.map(s => {
      const start = new Date(s.start);
      const end = new Date(s.end);
      if (isNaN(start) || isNaN(end) || end <= start) {
        throw new Error('invalid slot times');
      }
      return { mentorId, start, end, status: 'OPEN' };
    });

    const created = await prisma.slot.createMany({ data, skipDuplicates: false });
    res.status(201).json({ created: created.count });
  } catch (e) {
    console.error(e);
    res.status(400).json({ error: String(e.message || e) });
  }
});

/**
 * GET /availability
 * Query open slots by mentorId + date (YYYY-MM-DD, UTC day window)
 * query: mentorId, date
 */
app.get('/availability', async (req, res) => {
  const { mentorId, date } = req.query;
  if (!mentorId || !date) return res.status(400).json({ error: 'mentorId and date (YYYY-MM-DD) required' });

  const start = new Date(`${date}T00:00:00Z`);
  const end   = new Date(`${date}T23:59:59Z`);

  const slots = await prisma.slot.findMany({
    where: { mentorId, start: { gte: start, lte: end }, status: 'OPEN' },
    orderBy: { start: 'asc' }
  });

  res.json({ mentorId, date, slots });
});

/**
 * PATCH /availability/slots/:id/status
 * Change slot status (OPEN -> HELD/BOOKED or reverse)
 * body: { status: 'OPEN'|'HELD'|'BOOKED' }
 * (We’ll call this from Booking later)
 */
app.patch('/availability/slots/:id/status', async (req, res) => {
  const { id } = req.params;
  const { status } = req.body || {};
  if (!['OPEN','HELD','BOOKED'].includes(status)) {
    return res.status(400).json({ error: 'invalid status' });
  }
  try {
    const updated = await prisma.slot.update({ where: { id }, data: { status } });
    res.json(updated);
  } catch {
    res.status(404).json({ error: 'slot not found' });
  }
});

const port = process.env.PORT || 4102;
app.listen(port, () => console.log(`availability service on :${port}`));
