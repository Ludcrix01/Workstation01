// Minimal test tracker (vanilla JS) to validate endpoints from any browser
// Configure BASE_URL to your test server (default http://localhost:4000)
const BASE_URL = (window.TEST_SERVER_URL || 'http://localhost:4000');
const logEl = document.getElementById('log');
let sessionId = null;
let lastActionTs = null;
let buffer = [];
const INACTIVITY_MS = 60_000; // configurable

function log(...args){
  console.log(...args);
  logEl.textContent += args.map(a=> (typeof a === 'object' ? JSON.stringify(a) : String(a))).join(' ') + '\n';
  logEl.scrollTop = logEl.scrollHeight;
}

async function startSession(module='test'){
  const body = { userId: 'test-user', module };
  const res = await fetch(`${BASE_URL}/api/track/start-session`, { method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify(body)});
  const json = await res.json();
  sessionId = json.sessionId;
  log('session started', sessionId);
}

async function endSession(){
  if (!sessionId) return;
  await fetch(`${BASE_URL}/api/track/end-session`, { method:'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify({ sessionId }) });
  log('session ended', sessionId);
  sessionId = null;
}

async function flush(){
  if (!buffer.length || !sessionId) return;
  const payload = { sessionId, events: buffer.splice(0) };
  await fetch(`${BASE_URL}/api/track/event`, { method:'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify(payload) });
  log('flushed', payload.events.length);
}

function record(type, metadata){
  if (document.visibilityState !== 'visible' || !document.hasFocus()) return;
  lastActionTs = Date.now();
  if (!sessionId) startSession().catch(e=> log('start error', e));
  buffer.push({ type, timestamp: new Date().toISOString(), metadata });
}

// Event bindings
window.addEventListener('click', (e)=>{
  if (e.target.id === 'btn-action') record('click', { tag: 'btn-action' });
});
window.addEventListener('input', (e)=>{ if (e.target.id === 'input-test') record('input', { valueLength: (e.target.value || '').length }); }, true);
window.addEventListener('focus', ()=> record('focus'), true);
window.addEventListener('keydown', (e)=> record('keydown', { keyType: e.key.length>1 ? 'meta' : 'char' }));

// iframe messages (simulate Excel interactions)
window.addEventListener('message', (ev) => {
  try {
    const data = typeof ev.data === 'string' ? JSON.parse(ev.data) : ev.data;
    if (data && data.action === 'cellEdit') {
      record('excel-edit', { source: 'iframe' });
    }
  } catch(e) {}
});

// Buttons
document.getElementById('btn-action').addEventListener('click', ()=> log('button clicked'));
document.getElementById('btn-input').addEventListener('click', ()=> { const inp = document.getElementById('input-test'); inp.value = (inp.value || '') + 'a'; inp.dispatchEvent(new Event('input', { bubbles: true })); });
document.getElementById('btn-reset').addEventListener('click', ()=>{ buffer = []; sessionId = null; log('reset'); });

// Periodic flush and inactivity checker
setInterval(()=> flush().catch(e=> log('flush error', e)), 3000);
setInterval(()=>{
  if (lastActionTs && Date.now() - lastActionTs > INACTIVITY_MS) {
    endSession().catch(e=> log('end error', e));
    lastActionTs = null;
  }
}, 1000);

// Flush on unload
window.addEventListener('beforeunload', ()=>{
  if (buffer.length && sessionId) {
    try {
      navigator.sendBeacon(`${BASE_URL}/api/track/event`, JSON.stringify({ sessionId, events: buffer }));
    } catch(e){}
  }
});

log('Test tracker initialized — base:', BASE_URL);
