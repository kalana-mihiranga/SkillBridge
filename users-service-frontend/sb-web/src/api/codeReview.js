// src/api/codeReview.js
import { http } from './client';
const CR_API = import.meta.env.VITE_CODE_REVIEW_API || '/code-review';

export function listArtifacts(bookingId) {
  return http.get('/artifacts', { bookingId }, CR_API);
}

export function createArtifact(body) {
  // { bookingId, type, title, repoUrl?, content?, createdBy }
  return http.post('/artifacts', body, CR_API);
}

export function listComments(artifactId) {
  return http.get(`/artifacts/${artifactId}/comments`, {}, CR_API);
}

export function addComment(artifactId, body) {
  // { authorId, authorRole, body, filePath?, lineStart?, lineEnd? }
  return http.post(`/artifacts/${artifactId}/comments`, body, CR_API);
}

// --- New: Repo browsing ---
export function getRepoTree(artifactId, path = '') {
  return http.get(`/artifacts/${artifactId}/tree`, path ? { path } : {}, CR_API);
}
export async function getRepoRaw(artifactId, path) {
  const url = `${CR_API}/artifacts/${artifactId}/raw?path=${encodeURIComponent(path)}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`raw ${res.status}`);
  return res.text();
}
