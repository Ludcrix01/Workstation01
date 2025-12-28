import { useEffect, useRef } from 'react';

const DEFAULT_INACTIVITY_MS = 60_000;
const FLUSH_INTERVAL_MS = 5000;

type EventItem = { type: string; timestamp: string; metadata?: any };

export function useActivityTracker(moduleName: string, { inactivityMs = DEFAULT_INACTIVITY_MS } = {}) {
  const sessionIdRef = useRef<string | null>(null);
  const lastActionTsRef = useRef<number | null>(null);
  const bufferRef = useRef<EventItem[]>([]);

  // Placeholder: replace with real API calls
  async function startSession(): Promise<string> {
    try {
      const res = await fetch('/api/track/start-session', {
        method: 'POST', headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({ userId: (window as any).__MJ_USER__?.id ?? 'anonymous', module: moduleName, clientNonce: Math.random().toString(36).slice(2) })
      });
      const json = await res.json();
      return json.sessionId;
    } catch (err) {
      console.error('startSession error', err);
      throw err;
    }
  }

  async function endSession(sessionId: string | null) {
    if (!sessionId) return;
    try {
      await fetch('/api/track/end-session', { method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify({ sessionId }) });
    } catch (err) {
      console.error('endSession error', err);
    }
  }

  async function flushEvents() {
    if (!bufferRef.current.length || !sessionIdRef.current) return;
    const payload = { sessionId: sessionIdRef.current, events: bufferRef.current.splice(0) };
    try {
      await fetch('/api/track/event', { method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify(payload) });
    } catch (err) {
      console.error('flushEvents error', err);
      // on unload we use navigator.sendBeacon fallback; keep events in buffer to retry later
      bufferRef.current.unshift(...payload.events);
    }
  }

  function recordEvent(type: string, metadata?: any) {
    if (document.visibilityState !== 'visible' || !document.hasFocus()) return; // strict rule
    lastActionTsRef.current = Date.now();
    bufferRef.current.push({ type, timestamp: new Date().toISOString(), metadata });
    if (!sessionIdRef.current) {
      startSession().then(id => (sessionIdRef.current = id)).catch(() => {/* handle */});
    }
  }

  useEffect(() => {
    const handlers = {
      click: (e: Event) => recordEvent('click', { tag: (e.target as HTMLElement)?.tagName }),
      input: (e: Event) => recordEvent('input'),
      focus: (e: Event) => recordEvent('focus'),
      blur: (e: Event) => recordEvent('blur'),
      keydown: (e: KeyboardEvent) => recordEvent('keydown', { keyType: e.key.length > 1 ? 'meta' : 'char' })
    };

    window.addEventListener('click', handlers.click);
    window.addEventListener('input', handlers.input, true);
    window.addEventListener('focus', handlers.focus, true);
    window.addEventListener('blur', handlers.blur, true);
    window.addEventListener('keydown', handlers.keydown);

    const flushInterval = setInterval(() => flushEvents(), FLUSH_INTERVAL_MS);
    const tickInterval = setInterval(() => {
      if (lastActionTsRef.current && Date.now() - lastActionTsRef.current > inactivityMs) {
        // end session
        const sid = sessionIdRef.current;
        sessionIdRef.current = null;
        lastActionTsRef.current = null;
        endSession(sid).catch(() => {});
      }
    }, 1000);

    const onVisibility = () => {
      // do not record events when not visible
    };
    document.addEventListener('visibilitychange', onVisibility);

    const onBeforeUnload = () => {
      // best-effort flush: use navigator.sendBeacon if available
      if (bufferRef.current.length && sessionIdRef.current) {
        try {
          navigator.sendBeacon('/api/track/event', JSON.stringify({ sessionId: sessionIdRef.current, events: bufferRef.current }));
        } catch(e){}
      }
    };
    window.addEventListener('beforeunload', onBeforeUnload);

    return () => {
      window.removeEventListener('click', handlers.click);
      window.removeEventListener('input', handlers.input, true);
      window.removeEventListener('focus', handlers.focus, true);
      window.removeEventListener('blur', handlers.blur, true);
      window.removeEventListener('keydown', handlers.keydown);
      document.removeEventListener('visibilitychange', onVisibility);
      window.removeEventListener('beforeunload', onBeforeUnload);
      clearInterval(flushInterval);
      clearInterval(tickInterval);
      flushEvents();
    };
  }, [moduleName, inactivityMs]);
}
