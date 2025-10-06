// src/components/CodeViewer.jsx
import { useEffect, useMemo, useRef, useState } from 'react';

/**
 * Props:
 *  - text: string
 *  - filePath: string
 *  - comments: [{ id, body, lineStart, lineEnd, authorRole, filePath }]
 *  - onSelectRange(from, to)
 *  - dark: boolean
 */
export default function CodeViewer({
  text = '',
  filePath = '',
  comments = [],
  onSelectRange,
  dark = false,
}) {
  const lines = useMemo(() => text.split('\n'), [text]);

  // ---- UI state ----
  const [anchor, setAnchor] = useState(null);
  const [hover, setHover] = useState(null);
  const [openThreads, setOpenThreads] = useState(() => new Set());

  // find / goto
  const [query, setQuery] = useState('');
  const [matchIdx, setMatchIdx] = useState(-1);
  const [gotoVal, setGotoVal] = useState('');

  // height / resize
  const [paneH, setPaneH] = useState(72); // in vh
  const resizingRef = useRef(false);
  const startYRef = useRef(0);
  const startHRef = useRef(paneH);

  // scroll & minimap
  const scrollerRef = useRef(null);
  const railRef = useRef(null);
  const topShadowRef = useRef(null);
  const bottomShadowRef = useRef(null);

  // remember scrollTop per file
  const perFileScroll = useRef(new Map());

  // map line -> comments (for inline pins)
  const byLine = useMemo(() => {
    const map = new Map();
    for (const c of comments || []) {
      if (!c.lineStart) continue;
      const from = c.lineStart;
      const to = c.lineEnd || c.lineStart;
      for (let i = from; i <= to; i++) {
        const arr = map.get(i) || [];
        arr.push(c);
        map.set(i, arr);
      }
    }
    return map;
  }, [comments]);

  // color system (dark-aware)
  const cBg = dark ? 'bg-slate-900' : 'bg-white';
  const cText = dark ? 'text-slate-200' : 'text-slate-800';
  const cMuted = dark ? 'text-slate-400' : 'text-slate-600';
  const cBorder = dark ? 'border-slate-700' : 'border-slate-300';
  const rowAlt = dark ? 'bg-slate-800/40' : 'bg-slate-50/60';
  const selBg = dark ? 'bg-emerald-900/40' : 'bg-emerald-50';

  // selection helpers
  function clickLine(i) {
    if (anchor == null) setAnchor(i);
    else {
      const from = Math.min(anchor, i) + 1; // 1-based
      const to   = Math.max(anchor, i) + 1;
      setAnchor(null);
      setHover(null);
      onSelectRange?.(from, to);
      // center selection start
      const row = document.getElementById(`code-row-${from}`);
      row?.scrollIntoView({ block: 'center', behavior: 'smooth' });
    }
  }
  const range = useMemo(() => {
    if (anchor == null || hover == null) return null;
    const a = Math.min(anchor, hover);
    const b = Math.max(anchor, hover);
    return { a, b };
  }, [anchor, hover]);

  // shadows + per-file scroll memory
  function updateShadows() {
    const el = scrollerRef.current;
    if (!el) return;
    const atTop = el.scrollTop <= 0;
    const atBottom = Math.ceil(el.scrollTop + el.clientHeight) >= el.scrollHeight;
    if (topShadowRef.current) topShadowRef.current.style.opacity = atTop ? '0' : '1';
    if (bottomShadowRef.current) bottomShadowRef.current.style.opacity = atBottom ? '0' : '1';
  }
  function saveScroll() {
    const el = scrollerRef.current;
    if (!el) return;
    if (filePath) perFileScroll.current.set(filePath, el.scrollTop);
  }
  function restoreScroll() {
    const el = scrollerRef.current;
    if (!el) return;
    const top = filePath ? perFileScroll.current.get(filePath) ?? 0 : 0;
    el.scrollTop = top;
    updateShadows();
  }

  // restore scroll when file changes
  useEffect(() => {
    // tiny timeout so DOM lays out first
    const t = setTimeout(restoreScroll, 50);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filePath, text]);

  // attach scroll listener
  useEffect(() => {
    const el = scrollerRef.current;
    if (!el) return;
    updateShadows();
    const onScroll = () => { updateShadows(); saveScroll(); };
    el.addEventListener('scroll', onScroll, { passive: true });
    return () => el.removeEventListener('scroll', onScroll);
  }, [filePath]);

  // minimap click/drag
  useEffect(() => {
    const rail = railRef.current;
    const el = scrollerRef.current;
    if (!rail || !el) return;

    let dragging = false;
    function getTargetScroll(clientY) {
      const rect = rail.getBoundingClientRect();
      const rel = Math.min(Math.max(clientY - rect.top, 0), rect.height);
      const ratio = rect.height > 0 ? rel / rect.height : 0;
      return ratio * (el.scrollHeight - el.clientHeight);
    }
    function onDown(e) {
      dragging = true;
      el.scrollTop = getTargetScroll(e.clientY);
    }
    function onMove(e) {
      if (!dragging) return;
      el.scrollTop = getTargetScroll(e.clientY);
    }
    function onUp() { dragging = false; }

    rail.addEventListener('mousedown', onDown);
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
    return () => {
      rail.removeEventListener('mousedown', onDown);
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };
  }, []);

  // keyboard scrolling
  useEffect(() => {
    const el = scrollerRef.current;
    if (!el) return;
    function onKey(e) {
      if (!e.target.closest('input,textarea')) {
        if (e.key === 'j') { el.scrollBy({ top: 40, behavior: 'smooth' }); }
        if (e.key === 'k') { el.scrollBy({ top: -40, behavior: 'smooth' }); }
        if (e.key === 'PageDown') { el.scrollBy({ top: el.clientHeight * 0.9, behavior: 'smooth' }); }
        if (e.key === 'PageUp') { el.scrollBy({ top: -el.clientHeight * 0.9, behavior: 'smooth' }); }
        if (e.key === 'Home') { el.scrollTo({ top: 0, behavior: 'smooth' }); }
        if (e.key === 'End') { el.scrollTo({ top: el.scrollHeight, behavior: 'smooth' }); }
      }
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  // find matches
  const matches = useMemo(() => {
    if (!query.trim()) return [];
    const q = query.toLowerCase();
    const out = [];
    for (let i = 0; i < lines.length; i++) {
      if (lines[i].toLowerCase().includes(q)) out.push(i + 1); // 1-based line
    }
    return out;
  }, [query, lines]);

  useEffect(() => { setMatchIdx(matches.length ? 0 : -1); }, [matches.length]);

  function jumpToMatch(next) {
    if (!matches.length) return;
    let idx = matchIdx;
    if (idx === -1) idx = 0;
    else idx = (idx + (next ? 1 : -1) + matches.length) % matches.length;
    setMatchIdx(idx);
    const line = matches[idx];
    const row = document.getElementById(`code-row-${line}`);
    row?.scrollIntoView({ block: 'center', behavior: 'smooth' });
  }

  function gotoLine() {
    const n = parseInt(gotoVal, 10);
    if (!Number.isFinite(n) || n < 1 || n > lines.length) return;
    const row = document.getElementById(`code-row-${n}`);
    row?.scrollIntoView({ block: 'center', behavior: 'smooth' });
  }

  function toggleThread(lineNo) {
    setOpenThreads(prev => {
      const next = new Set(prev);
      if (next.has(lineNo)) next.delete(lineNo);
      else next.add(lineNo);
      return next;
    });
  }

  // resize drag
  useEffect(() => {
    function onMove(e) {
      if (!resizingRef.current) return;
      const dy = e.clientY - startYRef.current;
      const vh = Math.max(40, Math.min(85, startHRef.current + (dy / window.innerHeight) * 100));
      setPaneH(vh);
      updateShadows();
    }
    function onUp() { resizingRef.current = false; }
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
    return () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };
  }, []);

  const jumpTop = () => scrollerRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
  const jumpBottom = () => {
    const el = scrollerRef.current;
    if (el) el.scrollTo({ top: el.scrollHeight, behavior: 'smooth' });
  };

  // highlight active match line with subtle bg
  const activeMatchLine = matches.length && matchIdx >= 0 ? matches[matchIdx] : null;

  return (
    <div className={`rounded-xl overflow-hidden border ${cBorder} ${cBg} shadow-sm`}>
      {/* Sticky header */}
      <div className={`sticky top-0 z-10 ${cBg} bg-opacity-95 backdrop-blur border-b ${cBorder}`}>
        <div className="px-3 py-2 flex items-center justify-between gap-2">
          <div className={`text-xs truncate ${cMuted}`}>
            <span className="uppercase tracking-wide text-[10px] opacity-70 mr-2">FILE</span>
            <span className={`font-mono ${cText}`}>{filePath || '(unsaved)'}</span>
          </div>
          <div className="flex items-center gap-2">
            {/* Find */}
            <div className="flex items-center gap-1">
              <input
                value={query}
                onChange={(e)=>setQuery(e.target.value)}
                placeholder="Find…"
                className={`text-xs px-2 py-1 rounded-md border ${cBorder} ${cBg} ${cText}`}
              />
              <button onClick={()=>jumpToMatch(false)} className={`text-xs px-2 py-1 rounded-md border ${cBorder} hover:bg-slate-50/5 ${cText}`} disabled={!matches.length}>Prev</button>
              <button onClick={()=>jumpToMatch(true)}  className={`text-xs px-2 py-1 rounded-md border ${cBorder} hover:bg-slate-50/5 ${cText}`} disabled={!matches.length}>Next</button>
              <span className={`text-[11px] ${cMuted}`}>{matches.length ? `${matchIdx+1}/${matches.length}` : '0/0'}</span>
            </div>

            {/* Goto */}
            <div className="flex items-center gap-1">
              <input
                value={gotoVal}
                onChange={(e)=>setGotoVal(e.target.value)}
                placeholder="Go to line"
                className={`text-xs px-2 py-1 w-24 rounded-md border ${cBorder} ${cBg} ${cText}`}
              />
              <button onClick={gotoLine} className={`text-xs px-2 py-1 rounded-md border ${cBorder} hover:bg-slate-50/5 ${cText}`}>Go</button>
            </div>

            <button onClick={jumpTop} className={`text-xs px-2 py-1 rounded-md border ${cBorder} hover:bg-slate-50/5 ${cText}`}>Top</button>
            <button onClick={jumpBottom} className={`text-xs px-2 py-1 rounded-md border ${cBorder} hover:bg-slate-50/5 ${cText}`}>Bottom</button>
          </div>
        </div>
        <div ref={topShadowRef} className={`h-2 ${dark ? 'bg-gradient-to-b from-slate-700/70' : 'bg-gradient-to-b from-slate-200/70'} to-transparent transition-opacity`} />
      </div>

      {/* Main grid: code + minimap */}
      <div className="grid grid-cols-[1fr_10px_12px]">
        {/* Code scroller */}
        <div
          ref={scrollerRef}
          className={`font-mono text-[12px] leading-5 overflow-auto scroll-smooth ${cText}`}
          style={{ maxHeight: `${paneH}vh` }}
        >
          {lines.map((ln, i) => {
            const idx = i;
            const lineNo = idx + 1;
            const inSel = range && idx >= range.a && idx <= range.b;
            const thread = byLine.get(lineNo) || [];
            const threadOpen = openThreads.has(lineNo);
            const isActiveMatch = lineNo === activeMatchLine;

            return (
              <div key={i}>
                <div
                  id={`code-row-${lineNo}`}
                  className={`group grid grid-cols-[70px_1fr_40px] gap-0 px-2 ${
                    inSel ? selBg
                    : isActiveMatch ? (dark ? 'bg-cyan-900/30' : 'bg-cyan-50')
                    : (i % 2 ? cBg : rowAlt)
                  }`}
                  onMouseEnter={() => setHover(idx)}
                  onMouseLeave={() => setHover(null)}
                >
                  <button
                    type="button"
                    className={`pr-2 text-right select-none cursor-pointer ${cMuted} hover:!text-slate-300 ${anchor===idx ? 'bg-cyan-600/10 text-slate-200 font-semibold' : ''}`}
                    onClick={() => clickLine(idx)}
                    title="Click to set start/end"
                  >
                    {lineNo}
                  </button>
                  <pre className="whitespace-pre-wrap break-words py-0.5">{ln || ' '}</pre>
                  <div className="pl-1 py-0.5">
                    {thread.length > 0 && (
                      <button
                        title={`${thread.length} comment(s) – toggle`}
                        onClick={() => toggleThread(lineNo)}
                        className={`inline-flex items-center justify-center text-[10px] min-w-6 h-5 px-1 rounded-full ${dark ? 'bg-amber-600/90 text-white' : 'bg-amber-600 text-white'}`}
                      >
                        {thread.length}
                      </button>
                    )}
                  </div>
                </div>

                {/* Inline thread */}
                {threadOpen && thread.length > 0 && (
                  <div className={`px-4 py-2 ${dark ? 'bg-slate-900' : 'bg-white'} border-b ${cBorder}`}>
                    <ul className="space-y-2">
                      {thread.map(c => (
                        <li key={c.id} className={`rounded-lg p-2 border ${cBorder} ${dark ? 'bg-slate-800/60' : 'bg-slate-50'}`}>
                          <div className={`text-[11px] ${cMuted} mb-1`}>
                            {c.authorRole} • L{c.lineStart}{c.lineEnd ? `-${c.lineEnd}` : ''}
                          </div>
                          <div className="text-sm whitespace-pre-wrap">{c.body}</div>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Resize handle */}
        <div
          className={`cursor-row-resize ${dark ? 'bg-slate-800' : 'bg-slate-100'}`}
          onMouseDown={(e) => {
            resizingRef.current = true;
            startYRef.current = e.clientY;
            startHRef.current = paneH;
          }}
          title="Drag to resize height"
          style={{ userSelect: 'none' }}
        />

        {/* Minimap rail */}
        <div className="relative">
          <div
            ref={railRef}
            className={`absolute right-0 top-0 bottom-0 w-2 ${dark ? 'bg-slate-800/60' : 'bg-slate-200/60'} cursor-pointer`}
            title="Minimap: click/drag to scroll"
          />
          {/* viewport indicator */}
          <MiniMapViewport scrollerRef={scrollerRef} dark={dark} />
        </div>
      </div>

      {/* Bottom shadow */}
      <div ref={bottomShadowRef} className={`h-2 ${dark ? 'bg-gradient-to-t from-slate-700/70' : 'bg-gradient-to-t from-slate-200/70'} to-transparent transition-opacity`} />
    </div>
  );
}

/** Small component to render the viewport rectangle on the minimap rail */
function MiniMapViewport({ scrollerRef, dark }) {
  const [rect, setRect] = useState({ top: 0, height: 0 });

  useEffect(() => {
    const el = scrollerRef.current;
    if (!el) return;
    function update() {
      const total = el.scrollHeight || 1;
      const vis = el.clientHeight || 1;
      const top = el.scrollTop || 0;
      setRect({
        top: (top / total) * 100,
        height: (vis / total) * 100
      });
    }
    update();
    const onScroll = () => update();
    const onResize = () => update();
    el.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onResize);
    const obs = new ResizeObserver(update);
    obs.observe(el);
    return () => {
      el.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onResize);
      obs.disconnect();
    };
  }, [scrollerRef]);

  return (
    <div
      className={`absolute right-0 w-2 rounded ${dark ? 'bg-cyan-400/40' : 'bg-cyan-500/40'}`}
      style={{ top: `${rect.top}%`, height: `${Math.max(4, rect.height)}%` }}
    />
  );
}
