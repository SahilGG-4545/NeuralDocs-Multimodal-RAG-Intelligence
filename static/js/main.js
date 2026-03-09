// ── Canvas particle network ─────────────────────────────────
const cvs = document.getElementById('canvas-bg');
const ctx = cvs.getContext('2d');
let pts = [];

function resize() { cvs.width = innerWidth; cvs.height = innerHeight; }
resize(); window.addEventListener('resize', () => { resize(); initPts(); });

class Pt {
  constructor() { this.reset(); }
  reset() {
    this.x = Math.random() * cvs.width;
    this.y = Math.random() * cvs.height;
    this.r = Math.random() * 1.4 + .5;
    this.a = Math.random() * .35 + .08;
    this.vx = (Math.random() - .5) * .28;
    this.vy = (Math.random() - .5) * .28;
    this.c = Math.random() > .5 ? '29,78,216' : '14,165,233';
  }
  step() {
    this.x += this.vx; this.y += this.vy;
    if (this.x < 0 || this.x > cvs.width || this.y < 0 || this.y > cvs.height) this.reset();
  }
  draw() {
    ctx.beginPath(); ctx.arc(this.x, this.y, this.r, 0, Math.PI*2);
    ctx.fillStyle = `rgba(${this.c},${this.a})`; ctx.fill();
  }
}

function initPts() { pts = Array.from({length: 90}, () => new Pt()); }
initPts();

(function loop() {
  ctx.clearRect(0, 0, cvs.width, cvs.height);
  for (let i = 0; i < pts.length; i++) {
    for (let j = i+1; j < pts.length; j++) {
      const dx = pts[i].x - pts[j].x, dy = pts[i].y - pts[j].y;
      const d = Math.sqrt(dx*dx + dy*dy);
      if (d < 130) {
        ctx.beginPath();
        ctx.moveTo(pts[i].x, pts[i].y); ctx.lineTo(pts[j].x, pts[j].y);
        ctx.strokeStyle = `rgba(29,78,216,${.1*(1-d/130)})`;
        ctx.lineWidth = .5; ctx.stroke();
      }
    }
    pts[i].step(); pts[i].draw();
  }
  requestAnimationFrame(loop);
})();

// ── Nav scroll ──────────────────────────────────────────────
window.addEventListener('scroll', () =>
  document.getElementById('nav').classList.toggle('scrolled', scrollY > 20));

// ── Scroll reveal ───────────────────────────────────────────
const obs = new IntersectionObserver(
  entries => entries.forEach(e => { if (e.isIntersecting) e.target.classList.add('on'); }),
  { threshold: .1, rootMargin: '0px 0px -40px 0px' }
);
document.querySelectorAll('.reveal').forEach(el => obs.observe(el));

// ── Toast ───────────────────────────────────────────────────
function toast(msg, type = 'i', ms = 4000) {
  const ic = {s:'✓', e:'✗', i:'ℹ'};
  const t = document.createElement('div');
  t.className = `toast ${type}`;
  t.innerHTML = `<span>${ic[type]}</span><span>${msg}</span>`;
  document.getElementById('toasts').appendChild(t);
  setTimeout(() => {
    t.style.animation = 'toastOut .3s ease forwards';
    setTimeout(() => t.remove(), 300);
  }, ms);
}

// ── Health check ────────────────────────────────────────────
async function checkHealth() {
  try {
    const r = await fetch('/health');
    const d = await r.json();
    document.getElementById('sdot').className = 'sdot on';
    document.getElementById('stext').textContent = 'Online';
    document.getElementById('stat-docs').textContent = d.documents_loaded ?? '0';
    document.getElementById('stat-vs').textContent = d.vector_store_ready ? '✓ Ready' : '✗ Empty';
  } catch {
    document.getElementById('sdot').className = 'sdot off';
    document.getElementById('stext').textContent = 'Offline';
  }
}
checkHealth(); setInterval(checkHealth, 30000);

// ── Upload ──────────────────────────────────────────────────
const dz = document.getElementById('drop-zone');
const fi = document.getElementById('file-input');

['dragenter','dragover'].forEach(ev => dz.addEventListener(ev, e => { e.preventDefault(); dz.classList.add('over'); }));
['dragleave','drop']    .forEach(ev => dz.addEventListener(ev, e => { e.preventDefault(); dz.classList.remove('over'); }));

dz.addEventListener('drop', e => {
  const files = [...e.dataTransfer.files].filter(f => f.type === 'application/pdf');
  if (!files.length) { toast('Only PDF files are accepted.', 'e'); return; }
  files.forEach(uploadFile);
});
dz.addEventListener('click', e => { if (e.target.tagName !== 'BUTTON') fi.click(); });
fi.addEventListener('change', () => { [...fi.files].forEach(uploadFile); fi.value = ''; });

function fmtSz(b) {
  if (b < 1024) return b + ' B';
  if (b < 1<<20) return (b/1024).toFixed(1) + ' KB';
  return (b/(1<<20)).toFixed(1) + ' MB';
}

async function uploadFile(file) {
  const list = document.getElementById('file-list');
  const id = 'fi-' + Date.now() + Math.random();
  const el = document.createElement('div');
  el.className = 'f-item'; el.id = id;
  el.innerHTML = `
    <div class="f-icon">📄</div>
    <div class="f-meta">
      <div class="f-name">${file.name}</div>
      <div class="f-size">${fmtSz(file.size)}</div>
      <div class="prog"><div class="prog-fill" id="prog-${id}" style="width:35%"></div></div>
    </div>
    <span class="f-badge uploading" id="badge-${id}">Uploading</span>
  `;
  list.appendChild(el);

  const fd = new FormData(); fd.append('file', file);
  try {
    const res = await fetch('/upload', { method:'POST', body:fd });
    const d   = await res.json();
    if (!res.ok) throw new Error(d.error || 'Upload failed');
    document.getElementById(`prog-${id}`)?.remove();
    const badge = document.getElementById(`badge-${id}`);
    badge.textContent = 'Indexed'; badge.className = 'f-badge indexed';
    toast(`${file.name} indexed!`, 's');
    checkHealth();
  } catch(err) {
    document.getElementById(`prog-${id}`)?.remove();
    const badge = document.getElementById(`badge-${id}`);
    badge.textContent = 'Error'; badge.className = 'f-badge err';
    toast(err.message, 'e');
  }
}

// ── Query ───────────────────────────────────────────────────
function setQ(el) {
  document.getElementById('q-input').value = el.textContent.trim();
  document.getElementById('q-input').focus();
}

document.getElementById('q-input').addEventListener('keydown', e => {
  if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); submitQuery(); }
});

async function submitQuery() {
  const inp   = document.getElementById('q-input');
  const query = inp.value.trim();
  if (!query) { toast('Please enter a question.', 'e'); return; }

  const btn    = document.getElementById('q-btn');
  const loader = document.getElementById('loading');
  const rCard  = document.getElementById('resp-card');
  const srcWrap= document.getElementById('sources-wrap');

  btn.disabled = true;
  loader.classList.add('on');
  rCard.classList.remove('on');
  srcWrap.style.display = 'none';

  try {
    const res  = await fetch('/query', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Query failed');
    loader.classList.remove('on');
    renderResp(data);
  } catch(err) {
    loader.classList.remove('on');
    toast(err.message, 'e');
  } finally {
    btn.disabled = false;
  }
}

function renderResp(data) {
  const rCard = document.getElementById('resp-card');
  const body  = document.getElementById('resp-body');
  const badge = document.getElementById('q-type-badge');

  badge.textContent = data.query_type;
  badge.className   = `type-badge ${data.query_type === 'visual' ? 'badge-vis' : 'badge-txt'}`;

  body.innerHTML = '';
  typewrite(body, data.answer);

  const L = data.latency;
  document.getElementById('l-emb').textContent = L.embedding_s + 's';
  document.getElementById('l-ret').textContent = L.retrieval_s + 's';
  document.getElementById('l-llm').textContent = L.llm_s       + 's';
  document.getElementById('l-tot').textContent = L.total_s     + 's';

  rCard.classList.add('on');
  rCard.scrollIntoView({ behavior:'smooth', block:'nearest' });
  renderSources(data.sources);
}

function mdToHtml(line) {
  // Headings
  line = line.replace(/^### (.+)$/, '<strong>$1</strong>');
  line = line.replace(/^## (.+)$/, '<strong>$1</strong>');
  line = line.replace(/^# (.+)$/, '<strong>$1</strong>');
  // Bold
  line = line.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
  // Italic
  line = line.replace(/\*(.+?)\*/g, '<em>$1</em>');
  // Bullet list item (- or *)
  line = line.replace(/^[-•]\s+(.+)$/, '&nbsp;&nbsp;• $1');
  // Numbered list (1. 2. etc.)
  line = line.replace(/^(\d+)\.\s+(.+)$/, '<strong>$1.</strong> $2');
  return line;
}

function typewrite(el, text, speed = 10) {
  const paras = text.split('\n').filter(p => p.trim());
  el.innerHTML = paras.map(p => `<p>${mdToHtml(p)}</p>`).join('');
}

function renderSources(sources) {
  const wrap = document.getElementById('sources-wrap');
  const grid = document.getElementById('src-grid');
  grid.innerHTML = '';
  if (!sources?.length) { wrap.style.display = 'none'; return; }
  sources.forEach((s, i) => {
    const c = document.createElement('div');
    c.className = 'src-card'; c.style.animationDelay = `${i * .06}s`;
    c.innerHTML = `
      <span class="src-type-badge ${s.type === 'image' ? 'stype-img' : 'stype-txt'}">
        ${s.type === 'image' ? '🖼️ Image' : '📝 Text'}
      </span>
      <div class="src-name">${s.source}</div>
      <div class="src-page">Page ${(s.page ?? 0) + 1}</div>
    `;
    grid.appendChild(c);
  });
  wrap.style.display = 'block';
}

function copyResp() {
  navigator.clipboard.writeText(document.getElementById('resp-body').innerText)
    .then(() => toast('Copied to clipboard!', 's'));
}
