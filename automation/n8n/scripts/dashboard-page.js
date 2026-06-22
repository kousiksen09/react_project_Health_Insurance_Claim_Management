/**
 * n8n Code node — serve the Bug Fix Automation Dashboard HTML.
 * GET /bugfix/dashboard → rich tabbed single-page UI.
 */

const DASHBOARD_HTML = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8"/>
<meta name="viewport" content="width=device-width, initial-scale=1"/>
<title>Bug Fix Automation</title>
<style>
:root {
  --bg:#f0f2f8;--surface:#fff;--border:#dde1ee;--text:#1a1a2e;--muted:#5a6080;
  --accent:#5c4ee5;--accent-dark:#4338ca;--danger:#e74266;--success:#16a34a;--warn:#d97706;
  --badge-r:#fee2e2;--badge-rt:#dc2626;
  --badge-g:#dcfce7;--badge-gt:#16a34a;
  --badge-b:#dbeafe;--badge-bt:#1d4ed8;
  --badge-y:#fef9c3;--badge-yt:#92400e;
  --badge-p:#ede9fe;--badge-pt:#6d28d9;
  --badge-gray:#f3f4f6;--badge-grayt:#374151;
  font-family:system-ui,-apple-system,sans-serif;color:var(--text);background:var(--bg);
}
*{box-sizing:border-box;margin:0;padding:0}
body{min-height:100vh}
header{background:var(--surface);border-bottom:1px solid var(--border);padding:.75rem 1.5rem;
  display:flex;align-items:center;gap:.75rem}
header h1{font-size:1.15rem;font-weight:700}
.orch-status{display:flex;align-items:center;gap:.4rem;font-size:.8rem;color:var(--muted);margin-left:auto}
.orch-dot{width:8px;height:8px;border-radius:50%;background:#9ca3af}
.orch-dot.ok{background:#22c55e}
.orch-dot.err{background:#ef4444}
main{max-width:820px;margin:0 auto;padding:1.5rem 1rem}
.tabs{display:flex;gap:2px;background:var(--surface);border:1px solid var(--border);
  border-radius:10px;padding:4px;margin-bottom:1.5rem}
.tab{flex:1;padding:.55rem .5rem;border:none;background:none;cursor:pointer;
  border-radius:7px;font:inherit;font-size:.88rem;font-weight:500;color:var(--muted);
  transition:all .15s}
.tab:hover{background:var(--bg)}
.tab.active{background:var(--accent);color:#fff}
.pane{display:none}
.pane.active{display:block}
label{display:block;font-size:.82rem;font-weight:600;color:var(--muted);margin-bottom:.3rem;margin-top:1rem}
input,select,textarea{width:100%;padding:.55rem .7rem;border:1.5px solid var(--border);
  border-radius:7px;font:inherit;font-size:.9rem;transition:border .15s;background:var(--surface)}
input:focus,select:focus,textarea:focus{outline:none;border-color:var(--accent)}
textarea{min-height:140px;resize:vertical}
.hint{font-size:.78rem;color:var(--muted);margin-top:.25rem}
.btn{display:inline-flex;align-items:center;gap:.4rem;padding:.6rem 1.2rem;border:none;
  border-radius:7px;font:inherit;font-size:.88rem;font-weight:600;cursor:pointer;
  transition:opacity .15s}
.btn:disabled{opacity:.5;cursor:wait}
.btn-primary{background:var(--accent);color:#fff}
.btn-primary:hover:not(:disabled){background:var(--accent-dark)}
.btn-success{background:var(--success);color:#fff}
.btn-success:hover:not(:disabled){background:#15803d}
.btn-danger{background:var(--danger);color:#fff}
.btn-danger:hover:not(:disabled){background:#cf3c5c}
.btn-secondary{background:var(--bg);color:var(--text);border:1.5px solid var(--border)}
.btn-secondary:hover:not(:disabled){background:var(--border)}
.actions{display:flex;gap:.6rem;flex-wrap:wrap;margin-top:1rem}
.card{background:var(--surface);border:1.5px solid var(--border);border-radius:10px;padding:1rem 1.2rem;margin-top:1rem}
.card-title{font-size:.82rem;font-weight:700;color:var(--muted);text-transform:uppercase;
  letter-spacing:.04em;margin-bottom:.6rem}
.badge{display:inline-block;padding:.2rem .55rem;border-radius:99px;font-size:.75rem;font-weight:600}
.badge-queued,.badge-analyzing,.badge-patch_created,.badge-validating
  {background:var(--badge-b);color:var(--badge-bt)}
.badge-awaiting_approval{background:var(--badge-p);color:var(--badge-pt)}
.badge-approved,.badge-pr_created{background:var(--badge-g);color:var(--badge-gt)}
.badge-rejected,.badge-failed{background:var(--badge-r);color:var(--badge-rt)}
.badge-unknown{background:var(--badge-gray);color:var(--badge-grayt)}
.status-row{display:flex;align-items:center;gap:.6rem;flex-wrap:wrap;margin-bottom:.75rem}
.status-row strong{font-size:.95rem}
.meta{font-size:.8rem;color:var(--muted)}
.files{list-style:none;margin-top:.4rem}
.files li{font-size:.82rem;padding:.15rem 0;font-family:ui-monospace,monospace;color:var(--muted)}
.files li::before{content:"• ";color:var(--accent)}
.val-row{display:flex;justify-content:space-between;font-size:.82rem;padding:.2rem 0;
  border-bottom:1px solid var(--border)}
.val-row:last-child{border-bottom:none}
.ok{color:var(--success)} .fail{color:var(--danger)} .warn{color:var(--warn)}
.result-box{background:var(--bg);border:1px solid var(--border);border-radius:7px;
  padding:.85rem 1rem;font-family:ui-monospace,monospace;font-size:.8rem;
  white-space:pre-wrap;max-height:340px;overflow-y:auto;margin-top:1rem;
  border-left:3px solid var(--accent)}
.result-box.err{border-left-color:var(--danger)}
.copy-btn{background:none;border:none;cursor:pointer;color:var(--muted);font-size:.75rem;padding:.1rem .3rem}
.copy-btn:hover{color:var(--accent)}
.run-id-display{font-family:ui-monospace,monospace;font-size:.82rem;background:var(--bg);
  padding:.2rem .5rem;border-radius:4px;border:1px solid var(--border)}
.history-list{list-style:none;margin-top:.5rem}
.history-item{display:flex;align-items:center;gap:.5rem;padding:.4rem 0;
  border-bottom:1px solid var(--border);font-size:.83rem}
.history-item:last-child{border-bottom:none}
.history-item .run-id-link{cursor:pointer;color:var(--accent);font-family:ui-monospace,monospace;
  font-size:.8rem;text-decoration:underline}
.history-item .hist-actions{margin-left:auto;display:flex;gap:.3rem}
.spinner{display:inline-block;width:14px;height:14px;border:2px solid var(--border);
  border-top-color:var(--accent);border-radius:50%;animation:spin .6s linear infinite}
@keyframes spin{to{transform:rotate(360deg)}}
.templates{display:flex;gap:.4rem;flex-wrap:wrap;margin-top:.5rem}
.tpl-btn{font-size:.75rem;padding:.25rem .6rem;border-radius:99px;
  border:1px solid var(--border);background:var(--surface);cursor:pointer;color:var(--muted)}
.tpl-btn:hover{border-color:var(--accent);color:var(--accent)}
.refresh-row{display:flex;align-items:center;gap:.6rem;margin-top:.6rem;font-size:.8rem;color:var(--muted)}
.section-sep{border:none;border-top:1px solid var(--border);margin:1.2rem 0}
.toggle-row{display:flex;align-items:center;gap:.5rem;font-size:.85rem;margin-top:.75rem}
.toggle-row input[type=checkbox]{width:auto}
</style>
</head>
<body>
<header>
  <span style="font-size:1.3rem">🐛</span>
  <h1>Bug Fix Automation</h1>
  <div class="orch-status">
    <div class="orch-dot" id="orchDot"></div>
    <span id="orchLabel">Orchestrator</span>
  </div>
</header>
<main>
  <nav class="tabs">
    <button class="tab active" data-tab="report">📝 Report Bug</button>
    <button class="tab" data-tab="track">📊 Track Run</button>
    <button class="tab" data-tab="review">✅ Review &amp; Approve</button>
  </nav>

  <!-- ── Tab: Report Bug ────────────────────────────────── -->
  <div id="pane-report" class="pane active">
    <div class="templates">
      <span style="font-size:.78rem;color:var(--muted);align-self:center">Templates:</span>
      <button class="tpl-btn" data-tpl="ui">UI display issue</button>
      <button class="tpl-btn" data-tpl="filter">API missing filter</button>
      <button class="tpl-btn" data-tpl="cache">Stale data / cache</button>
      <button class="tpl-btn" data-tpl="purchased">Purchased policy shown</button>
    </div>
    <label for="bugText">Bug report</label>
    <textarea id="bugText" placeholder="[BUG] Title here&#10;component: frontend&#10;area: path/to/file.tsx&#10;severity: medium&#10;&#10;Describe the problem — what happens, what should happen."></textarea>
    <p class="hint">First line: <code>[BUG] Title</code> &nbsp;·&nbsp; Optional tags: <code>component:</code> frontend/backend/fullstack &nbsp;·&nbsp; <code>area:</code> file path &nbsp;·&nbsp; <code>severity:</code> low/medium/high/critical</p>
    <div class="actions">
      <button class="btn btn-primary" id="submitBug">🚀 Start Bug Fix</button>
    </div>
    <div id="reportResult"></div>
  </div>

  <!-- ── Tab: Track Run ─────────────────────────────────── -->
  <div id="pane-track" class="pane">
    <label for="trackId">Run ID</label>
    <div style="display:flex;gap:.5rem">
      <input id="trackId" placeholder="run_20260619_072505_kiwtwl" style="flex:1"/>
      <button class="btn btn-primary" id="checkBtn">🔍 Check</button>
    </div>
    <div class="refresh-row">
      <input type="checkbox" id="autoRefresh" style="width:auto"/>
      <label for="autoRefresh" style="margin:0;font-size:.8rem;font-weight:400">Auto-refresh every 30 s</label>
      <span id="refreshCountdown"></span>
    </div>
    <div id="statusCard"></div>
  </div>

  <!-- ── Tab: Review & Approve ──────────────────────────── -->
  <div id="pane-review" class="pane">
    <label for="reviewId">Run ID</label>
    <div style="display:flex;gap:.5rem">
      <input id="reviewId" placeholder="run_..." style="flex:1"/>
      <button class="btn btn-secondary" id="loadReviewBtn">Load Details</button>
    </div>
    <div id="reviewDetails"></div>
    <div id="reviewActions" style="display:none">
      <hr class="section-sep"/>
      <label for="reviewComment">Review comment (optional)</label>
      <input id="reviewComment" placeholder="Looks good — fix is minimal and correct."/>
      <div class="toggle-row">
        <input type="checkbox" id="createPrToggle"/>
        <label for="createPrToggle" style="margin:0;font-weight:400">Create GitHub PR immediately after approval</label>
      </div>
      <div class="actions">
        <button class="btn btn-success" id="approveBtn">✅ Approve</button>
        <button class="btn btn-danger" id="rejectBtn">❌ Reject</button>
      </div>
    </div>
    <div id="reviewResult"></div>
  </div>

  <!-- ── Run History ────────────────────────────────────── -->
  <hr class="section-sep"/>
  <div class="card-title">🕐 Recent Runs</div>
  <ul class="history-list" id="historyList"><li style="color:var(--muted);font-size:.82rem">No recent runs yet.</li></ul>
  <button class="btn btn-secondary" id="clearHistory" style="font-size:.75rem;margin-top:.5rem;display:none">Clear history</button>
</main>

<script>
const ACTION_URL = window.location.origin + '/webhook/bugfix/action';
const HISTORY_KEY = 'bf_runs_v2';
const STATUS_EMOJI = {
  queued:'🕐',analyzing:'🔍',patch_created:'🔧',validating:'🧪',
  awaiting_approval:'⏳',approved:'✅',rejected:'❌',pr_created:'🎉',failed:'🔴',
};
const IN_FLIGHT = new Set(['queued','analyzing','patch_created','validating']);

// ── helpers ──────────────────────────────────────────────
function $(id){ return document.getElementById(id); }

async function callAction(body) {
  const r = await fetch(ACTION_URL, {
    method:'POST', headers:{'Content-Type':'application/json'},
    body: JSON.stringify(body),
  });
  const text = await r.text();
  try { return JSON.parse(text); } catch { return { response: text }; }
}

function badge(status) {
  const cls = 'badge badge-' + (status || 'unknown');
  const emoji = STATUS_EMOJI[status] ?? '●';
  return '<span class="' + cls + '">' + emoji + ' ' + (status || 'unknown') + '</span>';
}

function escHtml(s) {
  return String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
}

function showResult(targetId, text, isError) {
  const el = $(targetId);
  el.innerHTML = '<div class="result-box' + (isError?' err':'') + '">' + escHtml(text) + '</div>';
}

// ── run history ──────────────────────────────────────────
function loadHistory() {
  try { return JSON.parse(localStorage.getItem(HISTORY_KEY) || '[]'); } catch { return []; }
}
function saveHistory(list) {
  localStorage.setItem(HISTORY_KEY, JSON.stringify(list.slice(0,10)));
}
function addToHistory(runId, status, title) {
  const list = loadHistory().filter(r => r.runId !== runId);
  list.unshift({ runId, status, title: title||runId, ts: Date.now() });
  saveHistory(list);
  renderHistory();
}
function renderHistory() {
  const list = loadHistory();
  const el = $('historyList');
  const clear = $('clearHistory');
  if (!list.length) {
    el.innerHTML = '<li style="color:var(--muted);font-size:.82rem">No recent runs yet.</li>';
    clear.style.display='none';
    return;
  }
  clear.style.display='inline-flex';
  el.innerHTML = list.map(r => {
    const age = Math.round((Date.now()-r.ts)/60000);
    const ageStr = age < 1 ? 'just now' : age < 60 ? age+'m ago' : Math.round(age/60)+'h ago';
    return '<li class="history-item">' +
      badge(r.status) +
      '<span class="run-id-link" data-runid="' + escHtml(r.runId) + '">' + escHtml(r.runId) + '</span>' +
      '<span class="meta">' + ageStr + '</span>' +
      '<div class="hist-actions">' +
        '<button class="btn btn-secondary" style="font-size:.72rem;padding:.2rem .5rem" data-hist-status="' + escHtml(r.runId) + '">Status</button>' +
        '<button class="btn btn-secondary" style="font-size:.72rem;padding:.2rem .5rem" data-hist-review="' + escHtml(r.runId) + '">Review</button>' +
      '</div>' +
    '</li>';
  }).join('');
}

// ── tabs ─────────────────────────────────────────────────
document.querySelectorAll('.tab').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
    document.querySelectorAll('.pane').forEach(p => p.classList.remove('active'));
    btn.classList.add('active');
    $('pane-'+btn.dataset.tab).classList.add('active');
  });
});

function switchTab(name) {
  document.querySelector('.tab[data-tab="'+name+'"]').click();
}

// ── templates ────────────────────────────────────────────
const TEMPLATES = {
  ui: '[BUG] UI element shows wrong data or is missing\\ncomponent: frontend\\narea: healthinsuranceclaim_frontend/src/features/<domain>/components/<Component>.tsx\\nseverity: medium\\n\\nOn the <page> screen, the <element> shows <incorrect value> instead of <expected value>.',
  filter: '[BUG] API endpoint returns items that should be excluded\\ncomponent: backend\\narea: HealthInsuranceClaimAPI/HealthInsuranceClaimAPI/Services/<Service>.cs\\nseverity: high\\n\\nThe <endpoint> returns <items> that should be filtered out based on <condition>.',
  cache: '[BUG] Data does not update after action — stale cache\\ncomponent: frontend\\narea: healthinsuranceclaim_frontend/src/features/<domain>/services/<domain>Api.ts\\nseverity: medium\\n\\nAfter <action>, the <data> on screen still shows the old value. Refreshing the page shows the correct value.',
  purchased: '[BUG] Purchased policy still shown on Browse Policies\\ncomponent: frontend\\narea: healthinsuranceclaim_frontend/src/features/customer/components/BrowsePolicies.tsx\\nseverity: high\\n\\nAfter a customer purchases a policy, it still appears in the Browse Policies list with an active "Buy" button. The customer should not be able to purchase the same policy twice.\\n\\nSteps to reproduce:\\n1. Log in as customer\\n2. Go to Browse Policies\\n3. Purchase a policy\\n4. Stay on or return to Browse Policies\\n\\nExpected: purchased policy is hidden or shown as \\"Owned\\"\\nActual: policy still appears with active Buy button',
};
document.querySelectorAll('.tpl-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    $('bugText').value = TEMPLATES[btn.dataset.tpl] || '';
    $('bugText').focus();
  });
});

// ── submit bug ───────────────────────────────────────────
$('submitBug').addEventListener('click', async () => {
  const text = $('bugText').value.trim();
  if (!text) { showResult('reportResult','Bug report text is required.',true); return; }
  const btn = $('submitBug');
  btn.disabled = true;
  btn.innerHTML = '<span class="spinner"></span> Submitting…';
  showResult('reportResult','');
  try {
    const res = await callAction({ action:'start', message:text });

    const isErr = !res.runId || res.status==='failed' || (res.response||'').toLowerCase().includes('error') || (res.response||'').toLowerCase().includes('failed');
    showResult('reportResult', res.response || res.output || JSON.stringify(res,null,2), isErr);

    if (res.runId && !isErr) {
      const titleMatch = text.match(/^\[BUG\]\s*(.+?)(?:\\n|$)/i);
      addToHistory(res.runId, res.status || 'queued', titleMatch?.[1] || text.slice(0,60));
      // Auto-switch to Track tab and begin 10 s polling
      $('trackId').value = res.runId;
      $('reviewId').value = res.runId;
      setTimeout(() => {
        switchTab('track');
        doCheckStatus(res.runId);
        // Start auto-refresh for this run
        $('autoRefresh').checked = true;
        $('autoRefresh').dispatchEvent(new Event('change'));
      }, 1200);
    }
  } catch(e) {
    const hint = e.message.includes('fetch') || e.message.includes('Failed')
      ? '\\n\\nCheck:\\n• Is the "Bug Fix Dashboard" workflow active in n8n?\\n• URL: ' + ACTION_URL
      : '';
    showResult('reportResult', 'Error: ' + e.message + hint, true);
  } finally {
    btn.disabled=false;
    btn.innerHTML='🚀 Start Bug Fix';
  }
});

// ── status card renderer ─────────────────────────────────
function renderStatusCard(run) {
  const a = run.analysis||{};
  const v = run.validation||{};
  const g = run.git||{};
  const files = a.changedFiles||[];

  let html = '<div class="card">';
  html += '<div class="status-row">' + badge(run.status);
  html += '<strong>' + escHtml(g.branchName||'n/a') + '</strong>';
  html += '<span class="meta">' + escHtml(run.runId) + ' <button class="copy-btn" title="Copy run ID" onclick="navigator.clipboard.writeText(\''+escHtml(run.runId)+'\')">📋</button></span>';
  html += '</div>';

  if (a.bugSummary) {
    html += '<div class="card-title">Summary</div>';
    html += '<p style="font-size:.85rem">' + escHtml(a.bugSummary) + '</p>';
  }

  if (files.length>0) {
    html += '<div class="card-title" style="margin-top:.8rem">Changed Files (' + files.length + ')</div>';
    html += '<ul class="files">' + files.map(f=>'<li>'+escHtml(f)+'</li>').join('') + '</ul>';
  }

  if (v.passed!==undefined) {
    html += '<div class="card-title" style="margin-top:.8rem">Validation</div>';
    html += '<div class="val-row"><span>Build</span><span class="'+(v.buildPassed?'ok':'fail')+'">'+(v.buildPassed?'✅ passed':'❌ failed')+'</span></div>';
    html += '<div class="val-row"><span>Tests</span><span class="'+(v.testsPassed?'ok':'warn')+'">'+(v.testsPassed?'✅ passed':'⚠️ issues')+'</span></div>';
    if (v.testSummary) html += '<div class="val-row"><span>Detail</span><span class="meta">'+escHtml(v.testSummary)+'</span></div>';
    if (v.failureReason) html += '<p style="font-size:.8rem;color:var(--danger);margin-top:.4rem">⚠️ '+escHtml(v.failureReason)+'</p>';
  }

  if (g.prUrl) {
    html += '<div class="card-title" style="margin-top:.8rem">Pull Request</div>';
    html += '<a href="'+escHtml(g.prUrl)+'" target="_blank" style="font-size:.85rem;color:var(--accent)">'+escHtml(g.prUrl)+'</a>';
  }

  if (run.error) {
    html += '<div style="margin-top:.8rem;padding:.6rem;background:var(--badge-r);border-radius:6px;font-size:.82rem">';
    html += '🔴 <strong>'+escHtml(run.error.code)+'</strong>: '+escHtml(run.error.message);
    html += '</div>';
  }

  if (run.status==='awaiting_approval') {
    html += '<div style="margin-top:.85rem;padding:.6rem;background:var(--badge-p);border-radius:6px;font-size:.83rem;color:var(--badge-pt)">';
    html += '⏳ Ready for your review — <button onclick="switchTab(\'review\');$(\'reviewId\').value=\''+escHtml(run.runId)+'\'" style="border:none;background:none;color:var(--accent);cursor:pointer;font-size:.83rem;text-decoration:underline">Go to Review &amp; Approve →</button>';
    html += '</div>';
  }

  html += '</div>';
  return html;
}

// ── check status ─────────────────────────────────────────
let autoRefreshTimer = null;
let countdown = 30;

async function doCheckStatus(runId) {
  if (!runId) return;
  $('checkBtn').disabled = true;
  try {
    const res = await callAction({ action:'status', runId });
    if (res.run) {
      $('statusCard').innerHTML = renderStatusCard(res.run);
      addToHistory(res.run.runId, res.run.status, res.run.intake?.bug?.title||runId);
      // If run finished (terminal or awaiting_approval), stop auto-refresh
      const TERMINAL = new Set(['awaiting_approval','approved','rejected','pr_created','failed']);
      if (TERMINAL.has(res.run.status)) {
        $('autoRefresh').checked = false;
        $('autoRefresh').dispatchEvent(new Event('change'));
        $('refreshCountdown').textContent = '';
      }
    } else {
      $('statusCard').innerHTML = '<div class="result-box'+(( res.response||'').includes('Error')||res.status==='failed'?' err':'')+'">'+escHtml(res.response||JSON.stringify(res,null,2))+'</div>';
    }
  } catch(e) {
    $('statusCard').innerHTML = '<div class="result-box err">Network error: '+escHtml(e.message)+
      '<br><small>Is the "Bug Fix Dashboard" workflow active in n8n?</small></div>';
  } finally {
    $('checkBtn').disabled=false;
  }
}

$('checkBtn').addEventListener('click', () => {
  const runId = $('trackId').value.trim();
  if (!runId) return;
  clearInterval(autoRefreshTimer); countdown=30; $('refreshCountdown').textContent='';
  doCheckStatus(runId);
});

$('autoRefresh').addEventListener('change', () => {
  clearInterval(autoRefreshTimer);
  autoRefreshTimer = null;
  $('refreshCountdown').textContent='';
  if ($('autoRefresh').checked) {
    countdown=10;
    autoRefreshTimer = setInterval(() => {
      countdown--;
      $('refreshCountdown').textContent = 'Next check in '+countdown+'s';
      if (countdown<=0) {
        countdown=10;
        const runId=$('trackId').value.trim();
        if (runId) doCheckStatus(runId);
      }
    },1000);
  }
});

// ── review panel ─────────────────────────────────────────
$('loadReviewBtn').addEventListener('click', async () => {
  const runId = $('reviewId').value.trim();
  if (!runId) return;
  $('reviewDetails').innerHTML = '<div class="card"><span class="spinner"></span> Loading…</div>';
  $('reviewActions').style.display='none';
  $('reviewResult').innerHTML='';
  try {
    const res = await callAction({ action:'status', runId });
    if (res.run) {
      $('reviewDetails').innerHTML = renderStatusCard(res.run);
      if (res.run.status==='awaiting_approval') {
        $('reviewActions').style.display='block';
      }
    } else {
      $('reviewDetails').innerHTML = '<div class="result-box">'+escHtml(res.response||'')+'</div>';
    }
  } catch(e) {
    $('reviewDetails').innerHTML='<div class="result-box err">'+escHtml(e.message)+'</div>';
  }
});

async function doApproveOrReject(action) {
  const runId=$('reviewId').value.trim();
  if(!runId) return;
  const btn = action==='approve' ? $('approveBtn') : $('rejectBtn');
  btn.disabled=true;
  $('reviewResult').innerHTML='';
  try {
    const res = await callAction({
      action,
      runId,
      reviewComment: $('reviewComment').value.trim(),
      createPr: action==='approve' && $('createPrToggle').checked,
      message: action==='reject' ? ($('reviewComment').value.trim()||'Rejected via dashboard') : undefined,
    });
    showResult('reviewResult', res.response||res.output||JSON.stringify(res,null,2), res.status==='failed'||(res.response||'').includes('Error'));
    if (res.runId) addToHistory(res.runId, res.status||action+'d', '');
    if (action==='approve'||action==='reject') $('reviewActions').style.display='none';
  } catch(e) {
    showResult('reviewResult','Network error: '+e.message,true);
  } finally {
    btn.disabled=false;
  }
}

$('approveBtn').addEventListener('click',()=>doApproveOrReject('approve'));
$('rejectBtn').addEventListener('click',()=>doApproveOrReject('reject'));

// ── history interactions ──────────────────────────────────
document.addEventListener('click', e => {
  if (e.target.dataset.histStatus) {
    const id=e.target.dataset.histStatus;
    $('trackId').value=id; switchTab('track'); doCheckStatus(id);
  }
  if (e.target.dataset.histReview) {
    const id=e.target.dataset.histReview;
    $('reviewId').value=id; switchTab('review');
  }
  if (e.target.classList.contains('run-id-link')) {
    const id=e.target.dataset.runid;
    $('trackId').value=id; switchTab('track'); doCheckStatus(id);
  }
});

$('clearHistory').addEventListener('click',()=>{ localStorage.removeItem(HISTORY_KEY); renderHistory(); });

// ── check URL params ──────────────────────────────────────
const params=new URLSearchParams(window.location.search);
if(params.get('runId')) {
  $('trackId').value=params.get('runId');
  $('reviewId').value=params.get('runId');
}
if(params.get('tab')) switchTab(params.get('tab'));

// ── orchestrator health check ─────────────────────────────
(async()=>{
  try {
    const r=await fetch(window.location.origin.replace('5678','4400')+'/health',{method:'GET'});
    if(r.ok){$('orchDot').className='orch-dot ok';$('orchLabel').textContent='Orchestrator: online';}
    else throw 1;
  } catch {
    $('orchDot').className='orch-dot err';
    $('orchLabel').textContent='Orchestrator: offline — start with: npm run dev in automation/orchestrator';
  }
})();

renderHistory();
</script>
</body>
</html>`;

return [{ json: { html: DASHBOARD_HTML } }];
