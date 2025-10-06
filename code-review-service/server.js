// code-review-service/server.js
require('dotenv').config();
const app = require('./app');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const GITHUB_TOKEN = process.env.GITHUB_TOKEN || null;

/** --- Helpers to parse GitHub repo URLs and call GitHub API/Raw --- */
function parseGithubUrl(repoUrl) {
  // supports:
  // https://github.com/owner/repo
  // https://github.com/owner/repo/tree/branch[/sub/dir]
  // https://github.com/owner/repo/blob/branch/path/to/file
  try {
    const u = new URL(repoUrl);
    const parts = u.pathname.replace(/^\/+/, '').split('/');
    const [owner, repo] = parts;
    let branch = 'main';
    let path = '';
    const idxTree = parts.indexOf('tree');
    const idxBlob = parts.indexOf('blob');
    if (idxTree === 2 && parts[3]) {
      branch = parts[3];
      path = parts.slice(4).join('/');
    } else if (idxBlob === 2 && parts[3]) {
      branch = parts[3];
      path = parts.slice(4).join('/');
    }
    return { owner, repo, branch, path };
  } catch {
    return null;
  }
}

async function ghJson(path) {
  const res = await fetch(`https://api.github.com${path}`, {
    headers: GITHUB_TOKEN ? { Authorization: `Bearer ${GITHUB_TOKEN}`, 'User-Agent': 'skillbridge-local' } : { 'User-Agent': 'skillbridge-local' }
  });
  if (!res.ok) {
    const t = await res.text();
    throw new Error(`GitHub API ${res.status} ${res.statusText}: ${t}`);
  }
  return res.json();
}

async function ghRaw(owner, repo, branch, filePath) {
  const url = `https://raw.githubusercontent.com/${owner}/${repo}/${branch}/${filePath}`;
  const res = await fetch(url, { headers: { 'User-Agent': 'skillbridge-local' } });
  if (!res.ok) throw new Error(`GitHub RAW ${res.status} ${res.statusText}`);
  return res.text();
}

/** ----------------- Existing endpoints (artifacts/comments) ----------------- */

// Create artifact
app.post('/artifacts', async (req, res) => {
  try {
    const { bookingId, type, title, repoUrl, content, createdBy } = req.body || {};
    if (!bookingId || !type || !title || !createdBy) {
      return res.status(400).json({ error: 'bookingId, type, title, createdBy required' });
    }
    const a = await prisma.artifact.create({ data: { bookingId, type, title, repoUrl, content, createdBy } });
    res.status(201).json(a);
  } catch (e) {
    res.status(500).json({ error: String(e.message || e) });
  }
});

// List artifacts
app.get('/artifacts', async (req, res) => {
  const { bookingId } = req.query;
  if (!bookingId) return res.status(400).json({ error: 'bookingId required' });
  const list = await prisma.artifact.findMany({ where: { bookingId }, orderBy: { createdAt: 'desc' } });
  res.json({ total: list.length, items: list });
});

// Get artifact by id
app.get('/artifacts/:id', async (req, res) => {
  const a = await prisma.artifact.findUnique({ where: { id: req.params.id } });
  if (!a) return res.status(404).json({ error: 'not found' });
  res.json(a);
});

// Create comment
app.post('/artifacts/:artifactId/comments', async (req, res) => {
  const { artifactId } = req.params;
  const { authorId, authorRole, body, filePath, lineStart, lineEnd } = req.body || {};
  if (!authorId || !authorRole || !body) {
    return res.status(400).json({ error: 'authorId, authorRole, body required' });
  }
  try {
    const c = await prisma.comment.create({
      data: { artifactId, authorId, authorRole, body, filePath, lineStart, lineEnd }
    });
    res.status(201).json(c);
  } catch (e) {
    res.status(500).json({ error: String(e.message || e) });
  }
});

// List comments
app.get('/artifacts/:artifactId/comments', async (req, res) => {
  const { artifactId } = req.params;
  const comments = await prisma.comment.findMany({
    where: { artifactId },
    orderBy: { createdAt: 'asc' }
  });
  res.json({ total: comments.length, comments });
});

/** ----------------- New: GitHub repo browsing for REPO artifacts -----------------
 * GET  /artifacts/:id/tree?path=
 * GET  /artifacts/:id/raw?path=
 * These require artifact.type === 'REPO' and a valid repoUrl.
 */

// List directory tree (files & folders) under optional path
app.get('/artifacts/:id/tree', async (req, res) => {
  try {
    const a = await prisma.artifact.findUnique({ where: { id: req.params.id } });
    if (!a) return res.status(404).json({ error: 'artifact not found' });
    if (a.type !== 'REPO' || !a.repoUrl) return res.status(400).json({ error: 'not a REPO artifact' });

    const parsed = parseGithubUrl(a.repoUrl);
    if (!parsed) return res.status(400).json({ error: 'invalid repoUrl' });

    const basePath = req.query.path ? String(req.query.path).replace(/^\/+/, '') : (parsed.path || '');
    // GET /repos/{owner}/{repo}/contents/{path}?ref={branch}
    const items = await ghJson(`/repos/${parsed.owner}/${parsed.repo}/contents/${basePath}?ref=${parsed.branch}`);
    // Normalize to a small structure
    const payload = (Array.isArray(items) ? items : [items]).map(it => ({
      type: it.type,           // 'file' | 'dir'
      name: it.name,
      path: it.path,
      size: it.size ?? null
    }));
    res.json({ repo: `${parsed.owner}/${parsed.repo}`, branch: parsed.branch, items: payload });
  } catch (e) {
    res.status(500).json({ error: String(e.message || e) });
  }
});

// Get raw text for a given file path
app.get('/artifacts/:id/raw', async (req, res) => {
  try {
    const a = await prisma.artifact.findUnique({ where: { id: req.params.id } });
    if (!a) return res.status(404).json({ error: 'artifact not found' });
    if (a.type !== 'REPO' || !a.repoUrl) return res.status(400).json({ error: 'not a REPO artifact' });

    const filePath = String(req.query.path || '').replace(/^\/+/, '');
    if (!filePath) return res.status(400).json({ error: 'path required' });

    const parsed = parseGithubUrl(a.repoUrl);
    if (!parsed) return res.status(400).json({ error: 'invalid repoUrl' });

    const text = await ghRaw(parsed.owner, parsed.repo, parsed.branch, filePath);
    res.setHeader('Content-Type', 'text/plain; charset=utf-8');
    res.send(text);
  } catch (e) {
    res.status(500).json({ error: String(e.message || e) });
  }
});

const port = process.env.PORT || 4105;
app.listen(port, () => console.log(`code-review service on :${port}`));
