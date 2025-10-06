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
  const [anchor, setAnchor] = useState(null);
  const [hover, setHover] = useState(null);
  const [openThreads, setOpenThreads] = useState(() => new Set());
  const scrollerRef = useRef(null);
  const topShadowRef = useRef(null);
  const bottomShadowRef = useRef(null);

  // map line -> [comments]
  const byLine = useMemo(() => {
    const map = new Map();
    for (const c of comments || []) {
      if (!c.lineStart) continue;
      for (let i = c.lineStart; i <= (c.lineEnd || c.lineStart); i++) {
        const arr = map.get(i) || [];
        arr.push(c);
        map.set(i, arr);
      }
    }
    return map;
  }, [comments]);

  // shadows
  function updateShadows() {
    const el = scrollerRef.current;
    if (!el) return;
    const atTop = el.scrollTop <= 0;
    const atBottom = Math.ceil(el.scrollTop + el.clientHeight) >= el.scrollHeight;
    if (topShadowRef.current) topShadowRef.current.style.opacity = atTop ? '0' : '1';
    if (bottomShadowRef.current) bottomShadowRef.current.style.opacity = atBottom ? '0' : '1';
  }
  useEffect(() => {
    const el = scrollerRef.current;
    if (!el) return;
    updateShadows();
    el.addEventListener('scroll', updateShadows, { passive: true });
    return () => el.removeEventListener('scroll', updateShadows);
  }, []);

  function clickLine(i) {
    if (anchor == null) setAnchor(i);
    else {
      const from = Math.min(anchor, i) + 1; // 1-based
      const to   = Math.max(anchor, i) + 1;
      setAnchor(null);
      setHover(null);
      onSelectRange?.(from, to);
      // auto-scroll to starting line
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

  const jumpTop = () => scrollerRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
  const jumpBottom = () => {
    const el = scrollerRef.current;
    if (el) el.scrollTo({ top: el.scrollHeight, behavior: 'smooth' });
  };

  const cBg = dark ? 'bg-slate-900' : 'bg-white';
  const cText = dark ? 'text-slate-200' : 'text-slate-800';
  const cMuted = dark ? 'text-slate-400' : 'text-slate-600';
  const cBorder = dark ? 'border-slate-700' : 'border-slate-300';
  const rowAlt = dark ? 'bg-slate-800/40' : 'bg-slate-50/60';
  const selBg = dark ? 'bg-emerald-900/40' : 'bg-emerald-50';

  function toggleThread(lineNo) {
    setOpenThreads(prev => {
      const next = new Set(prev);
      if (next.has(lineNo)) next.delete(lineNo);
      else next.add(lineNo);
      return next;
    });
  }

  return (
    <div className={`rounded-xl overflow-hidden border ${cBorder} ${cBg} shadow-sm`}>
      {/* Sticky header */}
      <div className={`sticky top-0 z-10 ${cBg} bg-opacity-95 backdrop-blur border-b ${cBorder}`}>
        <div className="px-3 py-2 flex items-center justify-between">
          <div className={`text-xs truncate ${cMuted}`}>
            <span className="uppercase tracking-wide text-[10px] opacity-70 mr-2">FILE</span>
            <span className={`font-mono ${cText}`}>{filePath || '(unsaved)'}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className={`hidden md:inline text-xs ${cMuted}`}>Click two lines to select a range.</span>
            <button onClick={jumpTop} className={`text-xs px-2 py-1 rounded-md border ${cBorder} hover:bg-slate-50/5 ${cText}`}>Top</button>
            <button onClick={jumpBottom} className={`text-xs px-2 py-1 rounded-md border ${cBorder} hover:bg-slate-50/5 ${cText}`}>Bottom</button>
          </div>
        </div>
        <div ref={topShadowRef} className={`h-2 ${dark ? 'bg-gradient-to-b from-slate-700/70' : 'bg-gradient-to-b from-slate-200/70'} to-transparent transition-opacity`} />
      </div>

      {/* Code scroller */}
      <div
        ref={scrollerRef}
        className={`font-mono text-[12px] leading-5 max-h-[62vh] overflow-auto scroll-smooth ${cText}`}
      >
        {lines.map((ln, i) => {
          const idx = i;
          const lineNo = idx + 1;
          const inSel = range && idx >= range.a && idx <= range.b;
          const thread = byLine.get(lineNo) || [];
          const threadOpen = openThreads.has(lineNo);
          return (
            <div key={i}>
              <div
                id={`code-row-${lineNo}`}
                className={`group grid grid-cols-[70px_1fr_40px] gap-0 px-2 ${inSel ? selBg : (i % 2 ? cBg : rowAlt)}`}
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
                      title={`${thread.length} comment(s) – click to toggle`}
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

      {/* Bottom shadow */}
      <div ref={bottomShadowRef} className={`h-2 ${dark ? 'bg-gradient-to-t from-slate-700/70' : 'bg-gradient-to-t from-slate-200/70'} to-transparent transition-opacity`} />
    </div>
  );
}
