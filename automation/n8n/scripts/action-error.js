/**
 * n8n Code node — ⚠️ Handle Parse Error
 *
 * Called when action-parse.js returns action='error' (invalid input).
 * Returns a helpful error message to the caller.
 */

const { error, _hint, _originalAction } = $input.first().json;

const lines = [
  `⚠️  Invalid request: ${error}`,
  '',
  _hint ? `Hint: ${_hint}` : '',
  _originalAction ? `Received action: "${_originalAction}"` : '',
  '',
  'Available actions:',
  '  start      — Report a new bug (requires message)',
  '  status     — Check run status (requires runId)',
  '  approve    — Approve a run (requires runId)',
  '  reject     — Reject a run (requires runId)',
  '  create-pr  — Create GitHub PR (requires runId, run must be approved)',
  '  cancel     — Cancel in-flight run (requires runId)',
].filter(Boolean).join('\n');

return [{ json: { response: lines, output: lines } }];
