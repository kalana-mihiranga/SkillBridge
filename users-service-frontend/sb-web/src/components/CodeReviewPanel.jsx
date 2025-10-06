import { useEffect, useMemo, useState } from 'react';
import { listArtifacts, createArtifact, listComments, addComment, getRepoTree, getRepoRaw } from '../api/codeReview';
import CodeViewer from './CodeViewer';

export default function CodeReviewPanel({ booking, meId, meRole='MENTEE', onClose }) {
  const [items, setItems] = useState([]);
  const [tab, setTab] = useState('viewer'); // default to viewer when opening
  const [err, setErr] = useState('');
  const [loading, setLoading] = useState(false);
  const [dark, setDark] = useState(true);   // NEW: dark toggle

  // New artifact
  const [type, setType] = useState('REPO');
  const [title, setTitle] = useState('');
  const [repoUrl, setRepoUrl] = useState('');
  const [content, setContent] = useState('');

  // Selected artifact + comments
  const [sel, setSel] = useState(null);
  const [comments, setComments] = useState([]);

  // Repo browsing
  const [tree, setTree] = useState([]);
  const [cwd, setCwd] = useState('');
  const [filePath, setFilePath] = useState('');
  const [fileText, setFileText] = useState('');
  const [repoInfo, setRepoInfo] = useState({ repo: '', branch: '' });

  // Inline comment form
  const [cBody, setCBody] = useState('');
  const [cFile, setCFile] = useState('');
  const [cStart, setCStart] = useState('');
  const [cEnd, setCEnd] = useState('');

  const chrome = dark
    ? { bg: 'bg-slate-900', panel: 'bg-slate-800', text: 'text-slate-200', muted: 'text-slate-400', border: 'border-slate-700' }
    : { bg: 'bg-white', panel: 'bg-white', text: 'text-slate-800', muted: 'text-slate-600', border: 'border-slate-300' };

  async function reload() {
    setLoading(true); setErr('');
    try {
      const r = await listArtifacts(booking.id);
      setItems(r.items || []);
      if (!sel && r.items?.length) {
        setSel(r.items[0]);
        await openArtifact(r.items[0], { keepTab: true });
      }
    } catch (e) { setErr(String(e)); }
    finally { setLoading(false); }
  }
  useEffect(() => { if (booking?.id) reload(); /* eslint-disable react-hooks/exhaustive-deps */ }, [booking?.id]);

  async function createOne(e) {
    e?.preventDefault();
    setErr('');
    try {
      const payload = { bookingId: booking.id, type, title, createdBy: meId };
      if (type === 'REPO') payload.repoUrl = repoUrl;
      else payload.content = content;
      const a = await createArtifact(payload);
      setItems(prev => [a, ...prev]);
      setTitle(''); setRepoUrl(''); setContent('');
      await openArtifact(a);
    } catch (e) { setErr(String(e)); }
  }

  async function openArtifact(a, opts = {}) {
    setSel(a);
    setComments([]);
    setCBody(''); setCFile(''); setCStart(''); setCEnd('');
    await loadComments(a.id);

    if (a.type === 'REPO' && a.repoUrl) {
      await openDir(a, '');
    } else if (a.type === 'DIFF' || a.type === 'FILE') {
      setFilePath(a.title);
      setFileText(a.content || '');
    }
    if (!opts.keepTab) setTab('viewer');
  }

  async function loadComments(artifactId) {
    try {
      const r = await listComments(artifactId);
      setComments(r.comments || []);
    } catch (e) { setErr(String(e)); }
  }

  // Repo helpers
  function crumbs(path) {
    const parts = (path || '').split('/').filter(Boolean);
    const acc = [];
    const list = [{ name: repoInfo.repo || '/', path: '' }];
    parts.forEach((p) => {
      acc.push(p);
      list.push({ name: p, path: acc.join('/') });
    });
    return list;
  }
  async function openDir(a, path) {
    setErr('');
    try {
      const r = await getRepoTree(a.id, path || '');
      setTree(r.items || []);
      setRepoInfo({ repo: r.repo, branch: r.branch });
      setCwd(path || '');
      setFilePath('');
      setFileText('');
    } catch (e) { setErr(String(e)); }
  }
  async function openFile(a, path) {
    setErr('');
    try {
      const text = await getRepoRaw(a.id, path);
      setFilePath(path);
      setFileText(text);
    } catch (e) { setErr(String(e)); }
  }

  function handleSelectRange(from, to) {
    setCFile(filePath || (sel?.type !== 'REPO' ? sel?.title : ''));
    setCStart(String(from));
    setCEnd(String(to));
  }

  async function addOneComment(e) {
    e?.preventDefault();
    if (!sel || !cBody.trim()) return;
    try {
      const payload = {
        authorId: meId,
        authorRole: meRole,
        body: cBody,
        filePath: cFile || undefined,
        lineStart: cStart ? Number(cStart) : undefined,
        lineEnd: cEnd ? Number(cEnd) : undefined
      };
      const c = await addComment(sel.id, payload);
      setComments(prev => [...prev, c]);
      setCBody('');
    } catch (e) { setErr(String(e)); }
  }

  const visibleComments = useMemo(() => {
    if (!sel) return [];
    if (sel.type === 'REPO') {
      if (!filePath) return comments;
      return comments.filter(c => c.filePath === filePath);
    }
    return comments;
  }, [comments, sel, filePath]);

  return (
    <div className="fixed inset-0 bg-black/55 z-[60] flex items-center justify-center">
      <div className={`w-full max-w-6xl rounded-2xl overflow-hidden shadow-2xl ${chrome.bg} ${chrome.text} border ${chrome.border}`}>
        {/* Header */}
        <div className={`sticky top-0 z-20 px-4 py-3 flex items-center justify-between border-b ${chrome.border}`}>
          <div className="flex items-center gap-3">
            <button
              onClick={onClose}
              className={`text-xs px-3 py-1.5 rounded-md border ${chrome.border} hover:bg-slate-50/5`}
              title="Close"
            >
              ← Close
            </button>
            <div className="text-sm">
              <span className="font-semibold">Code Review</span>
              <span className={`${chrome.muted} ml-2`}>Booking {booking?.id.slice(0, 8)}</span>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <span className={`text-xs ${chrome.muted}`}>Theme</span>
            <button
              onClick={()=>setDark(d=>!d)}
              className={`text-xs px-3 py-1.5 rounded-md border ${chrome.border} ${dark ? 'bg-slate-800' : 'bg-white'} hover:bg-slate-50/5`}
            >
              {dark ? 'Dark' : 'Light'}
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="px-4 pt-3 flex flex-wrap gap-2">
          <button onClick={()=>setTab('viewer')} className={`px-3 py-1.5 rounded-md text-sm border ${tab==='viewer'?'bg-emerald-600 text-white border-emerald-600':'hover:bg-slate-50/5 ' + chrome.border}`}>Viewer</button>
          <button onClick={()=>setTab('list')}   className={`px-3 py-1.5 rounded-md text-sm border ${tab==='list'  ?'bg-emerald-600 text-white border-emerald-600':'hover:bg-slate-50/5 ' + chrome.border}`}>Artifacts</button>
          <button onClick={()=>setTab('new')}    className={`px-3 py-1.5 rounded-md text-sm border ${tab==='new'   ?'bg-emerald-600 text-white border-emerald-600':'hover:bg-slate-50/5 ' + chrome.border}`}>New Artifact</button>
        </div>

        {err && <div className="px-4 pt-2 text-sm text-red-400">{String(err)}</div>}

        <div className="p-4 space-y-4">
          {/* Viewer */}
          {tab === 'viewer' && sel && (
            <div className="grid grid-cols-12 gap-4">
              {/* Sidebar */}
              <aside className={`col-span-4 rounded-xl border ${chrome.border} ${chrome.panel} overflow-hidden`}>
                <div className="sticky top-[60px] px-3 py-2 border-b ${chrome.border}">
                  {sel.type === 'REPO' ? (
                    <>
                      <div className={`text-xs ${chrome.muted} uppercase mb-1`}>Repository</div>
                      <div className="text-sm">
                        <div className="truncate font-medium">{repoInfo.repo} <span className={`${chrome.muted} text-xs`}>@ {repoInfo.branch}</span></div>
                        <nav className="mt-1 text-xs flex flex-wrap gap-x-1 gap-y-1">
                          {crumbs(cwd).map((c, i) => (
                            <span key={c.path} className="flex items-center">
                              {i !== 0 && <span className={`${chrome.muted} mx-1`}>/</span>}
                              <button
                                type="button"
                                onClick={()=>openDir(sel, c.path)}
                                className="hover:underline"
                                title={c.path || '/'}
                              >
                                {c.name || '/'}
                              </button>
                            </span>
                          ))}
                        </nav>
                      </div>
                    </>
                  ) : (
                    <>
                      <div className={`text-xs ${chrome.muted} uppercase mb-1`}>Artifact</div>
                      <div className="text-sm font-medium truncate">{sel.title}</div>
                    </>
                  )}
                </div>

                <div className="max-h-[62vh] overflow-auto px-2 py-2">
                  {sel.type === 'REPO' ? (
                    <>
                      {cwd && (
                        <button
                          className={`mb-2 text-xs px-2 py-1 rounded-md border ${chrome.border} hover:bg-slate-50/5`}
                          onClick={()=>openDir(sel, cwd.split('/').slice(0, -1).join('/'))}
                        >
                          ← Parent
                        </button>
                      )}
                      {tree.length === 0 ? (
                        <div className={`${chrome.muted} text-xs`}>Empty</div>
                      ) : (
                        <ul className="space-y-1 text-sm">
                          {tree.map(it => (
                            <li key={it.path} className="flex items-center justify-between">
                              <button
                                className="text-left flex-1 hover:underline"
                                onClick={() => it.type === 'dir' ? openDir(sel, it.path) : openFile(sel, it.path)}
                              >
                                {it.type === 'dir' ? '📁' : '📄'} {it.name}
                              </button>
                              {it.type === 'file' && <span className={`text-[10px] ${chrome.muted} ml-2`}>{it.size ?? ''}</span>}
                            </li>
                          ))}
                        </ul>
                      )}
                    </>
                  ) : (
                    <div className={`text-xs ${chrome.muted}`}>No tree for non-repo artifacts.</div>
                  )}
                </div>

                <div className={`border-t ${chrome.border} px-3 py-2 flex justify-between`}>
                  <button onClick={()=>setTab('list')} className={`text-sm px-3 py-1.5 rounded-md border ${chrome.border} hover:bg-slate-50/5`}>← Back to Artifacts</button>
                  <span className={`text-xs ${chrome.muted} self-center`}>Viewer</span>
                </div>
              </aside>

              {/* Code + Comments */}
              <section className="col-span-8 space-y-3">
                <CodeViewer
                  text={sel.type === 'REPO' ? fileText : (sel.content || '')}
                  filePath={sel.type === 'REPO' ? filePath : sel.title}
                  comments={visibleComments}
                  onSelectRange={handleSelectRange}
                  dark={dark}
                />

                <div className={`rounded-xl border ${chrome.border} ${chrome.panel} p-3 space-y-2`}>
                  <div className="text-sm font-semibold">Add comment</div>
                  <div className="grid md:grid-cols-4 gap-2 items-end">
                    <label className="block">
                      <div className={`text-xs ${chrome.muted} mb-1`}>File</div>
                      <input value={cFile} onChange={e=>setCFile(e.target.value)} className={`w-full rounded px-2 py-1.5 text-sm border ${chrome.border} ${chrome.bg}`} placeholder="path/in/repo" />
                    </label>
                    <label className="block">
                      <div className={`text-xs ${chrome.muted} mb-1`}>Start</div>
                      <input value={cStart} onChange={e=>setCStart(e.target.value)} className={`w-full rounded px-2 py-1.5 text-sm border ${chrome.border} ${chrome.bg}`} placeholder="12" />
                    </label>
                    <label className="block">
                      <div className={`text-xs ${chrome.muted} mb-1`}>End</div>
                      <input value={cEnd} onChange={e=>setCEnd(e.target.value)} className={`w-full rounded px-2 py-1.5 text-sm border ${chrome.border} ${chrome.bg}`} placeholder="18" />
                    </label>
                    <div className="md:col-span-4">
                      <textarea value={cBody} onChange={e=>setCBody(e.target.value)} rows={3} className={`w-full rounded px-3 py-2 text-sm border ${chrome.border} ${chrome.bg}`} placeholder="Actionable feedback, suggestions, references…" />
                    </div>
                    <div className="md:col-span-4 flex justify-end gap-2">
                      <button onClick={()=>{ setCBody(''); }} className={`text-sm px-3 py-1.5 rounded-md border ${chrome.border} hover:bg-slate-50/5`}>Clear</button>
                      <button onClick={addOneComment} className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded text-sm">Add comment</button>
                    </div>
                  </div>
                </div>

                <div className={`rounded-xl border ${chrome.border} ${chrome.panel} p-3 space-y-2`}>
                  <div className="text-sm font-semibold">Comments</div>
                  {visibleComments.length === 0 ? (
                    <div className={`text-sm ${chrome.muted}`}>No comments yet.</div>
                  ) : (
                    <ul className="space-y-2">
                      {visibleComments.map(c => (
                        <li key={c.id} className={`border ${chrome.border} rounded-lg p-2 ${dark ? 'bg-slate-800/60' : 'bg-slate-50'}`}>
                          <div className={`text-[11px] ${chrome.muted} mb-1`}>
                            {c.authorRole} {c.filePath ? `• ${c.filePath}` : ''} {c.lineStart ? `• L${c.lineStart}${c.lineEnd?`-${c.lineEnd}`:''}` : ''}
                          </div>
                          <div className="text-sm whitespace-pre-wrap">{c.body}</div>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </section>
            </div>
          )}

          {/* Artifacts */}
          {tab === 'list' && (
            <div className={`rounded-xl border ${chrome.border} ${chrome.panel}`}>
              {loading ? (
                <div className={`p-4 text-sm ${chrome.muted}`}>Loading…</div>
              ) : items.length === 0 ? (
                <div className={`p-4 text-sm ${chrome.muted}`}>No artifacts yet. Create one.</div>
              ) : (
                <ul className="divide-y divide-slate-700/40">
                  {items.map(a => (
                    <li key={a.id} className="py-3 px-3 flex justify-between items-center hover:bg-slate-50/5 rounded">
                      <div>
                        <div className="font-semibold">{a.title}</div>
                        <div className={`text-xs ${chrome.muted}`}>Type: {a.type}{a.repoUrl ? ` • ${a.repoUrl}` : ''}</div>
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={()=>openArtifact(a)}
                          className="text-sm px-3 py-1.5 rounded-md bg-cyan-600 hover:bg-cyan-700 text-white"
                        >
                          Open
                        </button>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}

          {/* New */}
          {tab === 'new' && (
            <form onSubmit={createOne} className={`space-y-3 rounded-xl border ${chrome.border} ${chrome.panel} p-3`}>
              <div className="grid md:grid-cols-3 gap-3">
                <label className="block">
                  <div className={`text-sm ${chrome.muted} mb-1`}>Type</div>
                  <select value={type} onChange={e=>setType(e.target.value)} className={`w-full border ${chrome.border} ${chrome.bg} rounded px-3 py-2 text-sm`}>
                    <option value="REPO">Repo URL</option>
                    <option value="DIFF">Diff (text)</option>
                    <option value="FILE">File contents (text)</option>
                  </select>
                </label>
                <label className="block md:col-span-2">
                  <div className={`text-sm ${chrome.muted} mb-1`}>Title</div>
                  <input value={title} onChange={e=>setTitle(e.target.value)} className={`w-full border ${chrome.border} ${chrome.bg} rounded px-3 py-2 text-sm`} placeholder="Short title"/>
                </label>
              </div>

              {type === 'REPO' && (
                <label className="block">
                  <div className={`text-sm ${chrome.muted} mb-1`}>Repository URL (GitHub)</div>
                  <input value={repoUrl} onChange={e=>setRepoUrl(e.target.value)} className={`w-full border ${chrome.border} ${chrome.bg} rounded px-3 py-2 text-sm`} placeholder="https://github.com/owner/repo or /tree/branch" />
                </label>
              )}

              {(type === 'DIFF' || type === 'FILE') && (
                <label className="block">
                  <div className={`text-sm ${chrome.muted} mb-1`}>{type === 'DIFF' ? 'Paste unified diff (.patch)' : 'Paste file content'}</div>
                  <textarea value={content} onChange={e=>setContent(e.target.value)} rows={10} className={`w-full border ${chrome.border} ${chrome.bg} rounded px-3 py-2 text-sm font-mono`} />
                </label>
              )}

              <div className="flex justify-between">
                <button type="button" onClick={()=>setTab('list')} className={`text-sm px-3 py-1.5 rounded-md border ${chrome.border} hover:bg-slate-50/5`}>← Back</button>
                <button type="submit" className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded">Create</button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
