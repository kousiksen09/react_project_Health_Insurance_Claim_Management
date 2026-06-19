/**
 * Serves the Bugfix Control Panel HTML (GET webhook).
 * Open the Production URL shown on the "Panel: GET" Webhook node in n8n.
 */
const PANEL_HTML = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Bugfix Control Panel</title>
  <style>
    :root { font-family: system-ui, sans-serif; color: #1a1a2e; background: #f4f6fb; }
    body { max-width: 720px; margin: 2rem auto; padding: 0 1rem; }
    h1 { font-size: 1.35rem; margin-bottom: 0.25rem; }
    .sub { color: #555; margin-bottom: 1.5rem; font-size: 0.95rem; }
    label { display: block; font-weight: 600; margin: 1rem 0 0.35rem; }
    select, input, textarea { width: 100%; box-sizing: border-box; padding: 0.55rem 0.65rem; border: 1px solid #ccd; border-radius: 6px; font: inherit; }
    textarea { min-height: 140px; resize: vertical; }
    button { margin-top: 1.25rem; background: #e74266; color: #fff; border: 0; padding: 0.65rem 1.2rem; border-radius: 6px; font: inherit; cursor: pointer; }
    button:hover { background: #cf3c5c; }
    button:disabled { opacity: 0.6; cursor: wait; }
    #out { margin-top: 1.5rem; padding: 1rem; background: #fff; border: 1px solid #dde; border-radius: 8px; white-space: pre-wrap; font-family: ui-monospace, monospace; font-size: 0.85rem; min-height: 4rem; }
    .hint { font-size: 0.85rem; color: #666; margin-top: 0.25rem; }
    .links { margin: 1rem 0; font-size: 0.9rem; }
    .links a { color: #e74266; }
  </style>
</head>
<body>
  <h1>Bugfix Control Panel</h1>
  <p class="sub">Run status, approve/reject, and new bug reports — linked to the local orchestrator via n8n.</p>
  <div class="links">
    <a href="http://localhost:5678" target="_blank">n8n</a> ·
    Watch progress in <strong>Executions</strong> on the Bugfix Chat / Action workflows
  </div>
  <form id="f">
    <label for="action">Action</label>
    <select id="action" name="action">
      <option value="start">Report bug (start run)</option>
      <option value="status">Check status</option>
      <option value="approve">Approve run</option>
      <option value="reject">Reject run</option>
      <option value="create-pr">Create GitHub PR</option>
      <option value="cancel">Cancel in-flight run</option>
    </select>
    <label for="runId">Run ID</label>
    <input id="runId" name="runId" placeholder="run_20260618_160000_abc123" />
    <p class="hint">Required for status / approve / reject / create-pr / cancel. Leave empty when reporting a new bug.</p>
    <label for="message">Bug report or reason</label>
    <textarea id="message" name="message" placeholder="[BUG] Title here&#10;&#10;component: frontend&#10;area: path/to/file.tsx&#10;&#10;Description of the bug..."></textarea>
    <p class="hint">For new bugs use [BUG] format. For reject, optional reason text.</p>
    <button type="submit" id="btn">Submit</button>
  </form>
  <div id="out">Ready.</div>
  <script>
    const ACTION_URL = window.location.origin + '/webhook/bugfix-action';
    const form = document.getElementById('f');
    const out = document.getElementById('out');
    const btn = document.getElementById('btn');
    const actionEl = document.getElementById('action');
    const runIdEl = document.getElementById('runId');
    const messageEl = document.getElementById('message');

    actionEl.addEventListener('change', () => {
      const a = actionEl.value;
      runIdEl.required = a !== 'start';
      messageEl.required = a === 'start';
    });

    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      btn.disabled = true;
      out.textContent = 'Working… (check n8n Executions for live progress on long runs)';
      try {
        const res = await fetch(ACTION_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: actionEl.value,
            runId: runIdEl.value.trim(),
            message: messageEl.value.trim(),
          }),
        });
        const text = await res.text();
        let data;
        try { data = JSON.parse(text); } catch { data = { response: text }; }
        out.textContent = data.response || data.output || JSON.stringify(data, null, 2);
        if (data.runId) runIdEl.value = data.runId;
      } catch (err) {
        out.textContent = 'Error: ' + (err.message || err);
      } finally {
        btn.disabled = false;
      }
    });
  </script>
</body>
</html>`;

return [{ json: { html: PANEL_HTML } }];
