
// users-service/server.js
const app = require('./app');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const ALLOWED_DOMAINS = ['backend', 'frontend', 'devops', 'data'];
const ALLOWED_BADGES = ['interview-coach', 'system-design-specialist'];
const ALLOWED_SENIORITY = ['SENIOR', 'STAFF', 'PRINCIPAL'];
const ALLOWED_ROLES = ['MENTEE', 'MENTOR'];

// --- Helpers ---
function validateProfile(input) {
  const errors = [];

  // required basics
  if (!input.email) errors.push('email required');
  if (!input.name) errors.push('name required');
  if (!input.role || !ALLOWED_ROLES.includes(input.role)) {
    errors.push(`role required, one of: ${ALLOWED_ROLES.join(', ')}`);
  }

  // mentor-specific
  if (input.role === 'MENTOR') {
    if (input.seniority && !ALLOWED_SENIORITY.includes(input.seniority)) {
      errors.push(`invalid seniority; use ${ALLOWED_SENIORITY.join(', ')}`);
    }
    if (input.domains && !Array.isArray(input.domains)) {
      errors.push('domains must be an array of strings');
    } else if (input.domains) {
      const bad = input.domains.filter(d => !ALLOWED_DOMAINS.includes(d));
      if (bad.length) errors.push(`invalid domains: ${bad.join(', ')}`);
    }
    if (input.badges && !Array.isArray(input.badges)) {
      errors.push('badges must be an array of strings');
    } else if (input.badges) {
      const bad = input.badges.filter(b => !ALLOWED_BADGES.includes(b));
      if (bad.length) errors.push(`invalid badges: ${bad.join(', ')}`);
    }
  }

  return errors;
}

// --- Routes ---

// Create profile (mentee or mentor)
app.post('/users', async (req, res) => {
  try {
    const body = req.body || {};
    const errors = validateProfile(body);
    if (errors.length) return res.status(400).json({ errors });

    const {
      email, name, role, seniority, rate, currency,
      timezone, bio, domains = [], badges = [], packages = null
    } = body;

    const user = await prisma.user.create({
      data: { email, name, role, seniority, rate, currency, timezone, bio, domains, badges, packages }
    });
    res.status(201).json(user);
  } catch (e) {
    console.error(e);
    // handle duplicate email gracefully
    if (String(e.message).includes('Unique constraint')) {
      return res.status(409).json({ error: 'email already exists' });
    }
    res.status(500).json({ error: e.message });
  }
});

// Get a profile by id
app.get('/users/:id', async (req, res) => {
  const user = await prisma.user.findUnique({ where: { id: req.params.id } });
  if (!user) return res.status(404).json({ error: 'not found' });
  res.json(user);
});

// Update profile fields
app.patch('/users/:id', async (req, res) => {
  const body = req.body || {};
  // light validation on arrays/enums if present
  if (body.seniority && !ALLOWED_SENIORITY.includes(body.seniority)) {
    return res.status(400).json({ error: `invalid seniority; use ${ALLOWED_SENIORITY.join(', ')}` });
  }
  if (body.domains) {
    if (!Array.isArray(body.domains)) return res.status(400).json({ error: 'domains must be array' });
    const bad = body.domains.filter(d => !ALLOWED_DOMAINS.includes(d));
    if (bad.length) return res.status(400).json({ error: `invalid domains: ${bad.join(', ')}` });
  }
  if (body.badges) {
    if (!Array.isArray(body.badges)) return res.status(400).json({ error: 'badges must be array' });
    const bad = body.badges.filter(b => !ALLOWED_BADGES.includes(b));
    if (bad.length) return res.status(400).json({ error: `invalid badges: ${bad.join(', ')}` });
  }

  try {
    const updated = await prisma.user.update({
      where: { id: req.params.id },
      data: body
    });
    res.json(updated);
  } catch (e) {
    if (String(e.message).includes('Record to update not found')) {
      return res.status(404).json({ error: 'not found' });
    }
    res.status(500).json({ error: e.message });
  }
});

// Browse mentors (filters: domain, seniority, badge, minRate, maxRate)
// Availability filtering will be added once we build the Availability service.
app.get('/mentors', async (req, res) => {
  const { domain, seniority, badge, minRate, maxRate, q } = req.query;

  const where = { role: 'MENTOR' };

  if (seniority) where.seniority = seniority; // enum validated by Prisma
  if (domain) where.domains = { has: domain }; // Postgres array contains
  if (badge) where.badges = { has: badge };

  // optional rate range
  if (minRate || maxRate) {
    where.rate = {};
    if (minRate) where.rate.gte = Number(minRate);
    if (maxRate) where.rate.lte = Number(maxRate);
  }

  // optional free-text query on name/bio
  const orderBy = [{ createdAt: 'desc' }];
  let mentors;
  if (q) {
    mentors = await prisma.user.findMany({
      where: {
        AND: [
          where,
          {
            OR: [
              { name: { contains: q, mode: 'insensitive' } },
              { bio: { contains: q, mode: 'insensitive' } }
            ]
          }
        ]
      },
      orderBy
    });
  } else {
    mentors = await prisma.user.findMany({ where, orderBy });
  }

  res.json({ total: mentors.length, mentors });
});

// --- Start server ---
const port = process.env.PORT || 4101;
app.listen(port, () => console.log(`users service on :${port}`));
