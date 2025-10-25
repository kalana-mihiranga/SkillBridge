const app = require('./app');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const fetch = (...args) => import('node-fetch').then(({default: f}) => f(...args));

const AVAIL = process.env.AVAIL_API_URL || 'http://availability-service:4102';
const USERS = process.env.USERS_API_URL || 'http://users-service:4101';

async function getUser(id) {
  const r = await fetch(`${USERS}/users/${id}`);
  if (!r.ok) return null;
  return r.json();
}

// helper to get a slot by id (we’ll add the endpoint in availability service)
async function getSlot(slotId) {
  const r = await fetch(`${AVAIL}/availability/slots/${slotId}`);
  if (!r.ok) {
    const text = await r.text();
    throw new Error(`availability get slot failed: ${r.status} ${text}`);
  }
  return r.json();
}

async function setSlotStatus(slotId, status) {
  const r = await fetch(`${AVAIL}/availability/slots/${slotId}/status`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ status })
  });
  if (!r.ok) {
    const text = await r.text();
    throw new Error(`availability set status failed: ${r.status} ${text}`);
  }
  return r.json();
}
/**
 * GET /bookings/details?menteeId=&mentorId=
 * Returns bookings enriched with mentor/mentee profiles.
 */
app.get('/bookings/details', async (req, res) => {
  try {
    const { menteeId, mentorId } = req.query;
    const where = {};
    if (menteeId) where.menteeId = menteeId;
    if (mentorId) where.mentorId = mentorId;

    const items = await prisma.booking.findMany({
      where,
      orderBy: { start: 'asc' }
    });

    const enriched = await Promise.all(items.map(async (b) => {
      const [mentee, mentor] = await Promise.all([
        getUser(b.menteeId),
        getUser(b.mentorId),
      ]);
      return {
        ...b,
        mentee: mentee ? { id: mentee.id, name: mentee.name, email: mentee.email } : null,
        mentor: mentor ? { id: mentor.id, name: mentor.name, email: mentor.email } : null,
      };
    }));

    res.json({ total: enriched.length, items: enriched });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: String(e.message || e) });
  }
});

/**
 * POST /bookings
 * body: { menteeId, mentorId, slotId, amount, currency, notes? }
 * flow:
 *   - fetch slot → must be OPEN
 *   - set slot HELD
 *   - create booking (CONFIRMED for local demo)
 *   - set slot BOOKED
 */
app.post('/bookings', async (req, res) => {
  try {
    const { menteeId, mentorId, slotId, amount = 0, currency = 'USD', notes = '' } = req.body || {};
    if (!menteeId || !mentorId || !slotId) {
      return res.status(400).json({ error: 'menteeId, mentorId, slotId required' });
    }

    const slot = await getSlot(slotId);
    if (!slot || slot.status !== 'OPEN' || slot.mentorId !== mentorId) {
      return res.status(409).json({ error: 'slot not available' });
    }

    // hold then book
    await setSlotStatus(slotId, 'HELD');

    const booking = await prisma.booking.create({
      data: {
        menteeId, mentorId, slotId,
        start: new Date(slot.start),
        end: new Date(slot.end),
        amount: Number(amount) || 0,
        currency,
        status: 'CONFIRMED',
        notes
      }
    });

    await setSlotStatus(slotId, 'BOOKED');

    res.status(201).json(booking);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: String(e.message || e) });
  }
});

/**
 * GET /bookings?menteeId=&mentorId=
 */
app.get('/bookings', async (req, res) => {
  const { menteeId, mentorId } = req.query;
  const where = {};
  if (menteeId) where.menteeId = menteeId;
  if (mentorId) where.mentorId = mentorId;
  const items = await prisma.booking.findMany({
    where,
    orderBy: { createdAt: 'desc' }
  });
  res.json({ total: items.length, items });
});

/**
 * DELETE /bookings/:id
 * - mark booking CANCELLED
 * - set slot back to OPEN
 */
app.delete('/bookings/:id', async (req, res) => {
  try {
    const b = await prisma.booking.findUnique({ where: { id: req.params.id } });
    if (!b) return res.status(404).json({ error: 'not found' });

    await prisma.booking.update({
      where: { id: b.id },
      data: { status: 'CANCELLED' }
    });
    await setSlotStatus(b.slotId, 'OPEN');

    res.json({ ok: true });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: String(e.message || e) });
  }
});

const port = process.env.PORT || 4103;
app.listen(port, () => console.log(`booking service on :${port}`));

