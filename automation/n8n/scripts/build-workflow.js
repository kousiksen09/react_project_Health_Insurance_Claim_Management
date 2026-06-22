/**
 * Regenerate importable n8n workflow JSON files.
 * Usage: node scripts/build-workflow.js
 *
 * Generates:
 *   bugfix-webhook-demo.json  — simple webhook intake
 *   bugfix-chat-demo.json     — chat trigger
 *   bugfix-control-panel.json — legacy single-node control panel (kept for reference)
 *   bugfix-dashboard.json     — ✨ new dashboard with Switch routing + beautiful HTML
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');

const webhookCode = fs.readFileSync(path.join(root, 'scripts/process-webhook-message.js'), 'utf8');
const chatCode = fs.readFileSync(path.join(root, 'scripts/process-chat-message.js'), 'utf8');
const panelPageCode = fs.readFileSync(path.join(root, 'scripts/control-panel-page.js'), 'utf8');
const panelActionCode = fs.readFileSync(path.join(root, 'scripts/control-panel-action.js'), 'utf8');

// New dashboard workflow scripts
const dashPageCode = fs.readFileSync(path.join(root, 'scripts/dashboard-page.js'), 'utf8');
const actionParseCode = fs.readFileSync(path.join(root, 'scripts/action-parse.js'), 'utf8');
const actionStartCode = fs.readFileSync(path.join(root, 'scripts/action-start.js'), 'utf8');
const actionStatusCode = fs.readFileSync(path.join(root, 'scripts/action-status.js'), 'utf8');
const actionApproveCode = fs.readFileSync(path.join(root, 'scripts/action-approve.js'), 'utf8');
const actionRejectCode = fs.readFileSync(path.join(root, 'scripts/action-reject.js'), 'utf8');
const actionCreatePrCode = fs.readFileSync(path.join(root, 'scripts/action-create-pr.js'), 'utf8');
const actionCancelCode = fs.readFileSync(path.join(root, 'scripts/action-cancel.js'), 'utf8');
const actionErrorCode = fs.readFileSync(path.join(root, 'scripts/action-error.js'), 'utf8');
const actionHealthCode = fs.readFileSync(path.join(root, 'scripts/action-health.js'), 'utf8');

const webhookWorkflow = {
  name: 'Bugfix Webhook Demo',
  nodes: [
    {
      parameters: {
        httpMethod: 'POST',
        path: 'bugfix-demo',
        responseMode: 'responseNode',
        options: {},
      },
      id: 'webhook-trigger-001',
      name: 'Webhook',
      type: 'n8n-nodes-base.webhook',
      typeVersion: 2,
      position: [240, 300],
      webhookId: 'bugfix-webhook-demo',
    },
    {
      parameters: { mode: 'runOnceForAllItems', jsCode: webhookCode },
      id: 'process-message-001',
      name: 'Process message',
      type: 'n8n-nodes-base.code',
      typeVersion: 2,
      position: [480, 300],
    },
    {
      parameters: {
        respondWith: 'json',
        responseBody: '={{ { response: $json.response } }}',
        options: {},
      },
      id: 'respond-webhook-001',
      name: 'Respond to Webhook',
      type: 'n8n-nodes-base.respondToWebhook',
      typeVersion: 1.1,
      position: [720, 300],
    },
  ],
  connections: {
    Webhook: {
      main: [[{ node: 'Process message', type: 'main', index: 0 }]],
    },
    'Process message': {
      main: [[{ node: 'Respond to Webhook', type: 'main', index: 0 }]],
    },
  },
  pinData: {},
  settings: { executionOrder: 'v1' },
  staticData: null,
  tags: [{ name: 'bugfix-demo' }],
  meta: { templateCredsSetupCompleted: false },
};

// n8n 1.82: Chat Trigger exists; @n8n/n8n-nodes-langchain.chat does NOT.
// Use "When Last Node Finishes" — Code node returns { output: "..." }.
const chatWorkflow = {
  name: 'Bugfix Chat Demo',
  nodes: [
    {
      parameters: {
        options: {
          responseMode: 'lastNode',
        },
      },
      id: 'chat-trigger-001',
      name: 'When chat message received',
      type: '@n8n/n8n-nodes-langchain.chatTrigger',
      typeVersion: 1.1,
      position: [240, 300],
      webhookId: 'bugfix-chat-demo',
    },
    {
      parameters: { mode: 'runOnceForAllItems', jsCode: chatCode },
      id: 'process-message-001',
      name: 'Process message',
      type: 'n8n-nodes-base.code',
      typeVersion: 2,
      position: [480, 300],
    },
  ],
  connections: {
    'When chat message received': {
      main: [[{ node: 'Process message', type: 'main', index: 0 }]],
    },
  },
  pinData: {},
  settings: { executionOrder: 'v1' },
  staticData: null,
  tags: [{ name: 'bugfix-demo' }],
  meta: { templateCredsSetupCompleted: false },
};

fs.writeFileSync(path.join(root, 'bugfix-webhook-demo.json'), JSON.stringify(webhookWorkflow, null, 2));
fs.writeFileSync(path.join(root, 'bugfix-chat-demo.json'), JSON.stringify(chatWorkflow, null, 2));

// ── NEW: Bug Fix Dashboard (Switch-routed, named nodes) ─────────────────────────────────────
//
// Layout (y-coordinates):
//
//   GET /bugfix/dashboard → Build Dashboard Page → Respond Dashboard HTML
//
//   POST /bugfix/action   → 📥 Parse Request
//                                   ↓
//                          🔀 Route by Action  (Switch — 7 outputs: error,start,status,approve,reject,create-pr,cancel)
//                           ↓     ↓      ↓       ↓      ↓      ↓          ↓
//                          Err  Start  Status  Approve Reject  PR       Cancel
//                                 └──────┴───────┴───────┴──────┴─────────┘
//                                                   ↓
//                                        📤 Respond to Client

const dashboardWorkflow = {
  name: 'Bug Fix Dashboard',
  nodes: [
    // ── GET: serve HTML ───────────────────────────────────────────────────────────────────────
    {
      parameters: { httpMethod: 'GET', path: 'bugfix/dashboard', responseMode: 'responseNode', options: {} },
      id: 'dash-get-001', name: 'GET /bugfix/dashboard', type: 'n8n-nodes-base.webhook',
      typeVersion: 2, position: [200, 200], webhookId: 'bugfix-dashboard-get',
    },
    {
      parameters: { mode: 'runOnceForAllItems', jsCode: dashPageCode },
      id: 'dash-build-001', name: 'Build Dashboard Page', type: 'n8n-nodes-base.code',
      typeVersion: 2, position: [440, 200],
    },
    {
      parameters: {
        respondWith: 'text', responseBody: '={{ $json.html }}',
        options: { responseHeaders: { entries: [{ name: 'Content-Type', value: 'text/html; charset=utf-8' }] } },
      },
      id: 'dash-respond-html-001', name: 'Respond Dashboard HTML', type: 'n8n-nodes-base.respondToWebhook',
      typeVersion: 1.1, position: [680, 200],
    },

    // ── POST: action pipeline ─────────────────────────────────────────────────────────────────
    {
      parameters: { httpMethod: 'POST', path: 'bugfix/action', responseMode: 'responseNode', options: {} },
      id: 'dash-post-001', name: 'POST /bugfix/action', type: 'n8n-nodes-base.webhook',
      typeVersion: 2, position: [200, 500], webhookId: 'bugfix-dashboard-action',
    },
    {
      parameters: { mode: 'runOnceForAllItems', jsCode: actionParseCode },
      id: 'dash-parse-001', name: '📥 Parse Request', type: 'n8n-nodes-base.code',
      typeVersion: 2, position: [440, 500],
    },
    // Switch node — routes on $json.action.
    // NOTE: Switch v3 (n8n ≥ 1.x) requires each `conditions` block to include an inner
    // `options` object with caseSensitive/typeValidation, otherwise it throws
    // "Cannot read properties of undefined (reading 'caseSensitive')" at runtime.
    (() => {
      const mkRule = (action, outputKey) => ({
        conditions: {
          options: { caseSensitive: true, leftValue: '', typeValidation: 'loose', version: 2 },
          conditions: [{
            id: 'cond-' + action,
            leftValue: '={{ $json.action }}',
            rightValue: action,
            operator: { type: 'string', operation: 'equals', name: 'filter.operator.equals' },
          }],
          combinator: 'and',
        },
        renameOutput: true,
        outputKey,
      });
      return {
        parameters: {
          mode: 'rules',
          rules: {
            values: [
              mkRule('error',     '⚠️ Error'),
              mkRule('start',     '🐛 Start Bug Fix'),
              mkRule('status',    '📊 Check Status'),
              mkRule('approve',   '✅ Approve Run'),
              mkRule('reject',    '❌ Reject Run'),
              mkRule('create-pr', '📦 Create GitHub PR'),
              mkRule('cancel',    '🚫 Cancel Run'),
              mkRule('health',    '💓 Health Check'),
            ],
          },
          options: { fallbackOutput: 'none' },
          looseTypeValidation: true,
        },
        id: 'dash-switch-001', name: '🔀 Route by Action', type: 'n8n-nodes-base.switch',
        typeVersion: 3.2, position: [680, 500],
      };
    })(),
    // Action nodes — one per branch
    {
      parameters: { mode: 'runOnceForAllItems', jsCode: actionErrorCode },
      id: 'act-error-001', name: '⚠️ Handle Invalid Action', type: 'n8n-nodes-base.code',
      typeVersion: 2, position: [920, 280],
    },
    {
      parameters: { mode: 'runOnceForAllItems', jsCode: actionStartCode },
      id: 'act-start-001', name: '🐛 Start Bug Fix', type: 'n8n-nodes-base.code',
      typeVersion: 2, position: [920, 420],
    },
    {
      parameters: { mode: 'runOnceForAllItems', jsCode: actionStatusCode },
      id: 'act-status-001', name: '📊 Check Run Status', type: 'n8n-nodes-base.code',
      typeVersion: 2, position: [920, 540],
    },
    {
      parameters: { mode: 'runOnceForAllItems', jsCode: actionApproveCode },
      id: 'act-approve-001', name: '✅ Approve Run', type: 'n8n-nodes-base.code',
      typeVersion: 2, position: [920, 660],
    },
    {
      parameters: { mode: 'runOnceForAllItems', jsCode: actionRejectCode },
      id: 'act-reject-001', name: '❌ Reject Run', type: 'n8n-nodes-base.code',
      typeVersion: 2, position: [920, 780],
    },
    {
      parameters: { mode: 'runOnceForAllItems', jsCode: actionCreatePrCode },
      id: 'act-createpr-001', name: '📦 Create GitHub PR', type: 'n8n-nodes-base.code',
      typeVersion: 2, position: [920, 900],
    },
    {
      parameters: { mode: 'runOnceForAllItems', jsCode: actionCancelCode },
      id: 'act-cancel-001', name: '🚫 Cancel Run', type: 'n8n-nodes-base.code',
      typeVersion: 2, position: [920, 1020],
    },
    {
      parameters: { mode: 'runOnceForAllItems', jsCode: actionHealthCode },
      id: 'act-health-001', name: '💓 Health Check', type: 'n8n-nodes-base.code',
      typeVersion: 2, position: [920, 1180],
    },
    // Single Respond node — all branches converge here
    {
      parameters: { respondWith: 'json', responseBody: '={{ { response: $json.response, runId: $json.runId, status: $json.status, online: $json.online, run: $json.run } }}', options: {} },
      id: 'dash-respond-json-001', name: '📤 Respond to Client', type: 'n8n-nodes-base.respondToWebhook',
      typeVersion: 1.1, position: [1180, 650],
    },
  ],
  connections: {
    'GET /bugfix/dashboard': { main: [[{ node: 'Build Dashboard Page', type: 'main', index: 0 }]] },
    'Build Dashboard Page': { main: [[{ node: 'Respond Dashboard HTML', type: 'main', index: 0 }]] },
    'POST /bugfix/action': { main: [[{ node: '📥 Parse Request', type: 'main', index: 0 }]] },
    '📥 Parse Request': { main: [[{ node: '🔀 Route by Action', type: 'main', index: 0 }]] },
    '🔀 Route by Action': {
      main: [
        [{ node: '⚠️ Handle Invalid Action', type: 'main', index: 0 }],  // output 0 = error
        [{ node: '🐛 Start Bug Fix', type: 'main', index: 0 }],           // output 1 = start
        [{ node: '📊 Check Run Status', type: 'main', index: 0 }],        // output 2 = status
        [{ node: '✅ Approve Run', type: 'main', index: 0 }],             // output 3 = approve
        [{ node: '❌ Reject Run', type: 'main', index: 0 }],              // output 4 = reject
        [{ node: '📦 Create GitHub PR', type: 'main', index: 0 }],        // output 5 = create-pr
        [{ node: '🚫 Cancel Run', type: 'main', index: 0 }],              // output 6 = cancel
        [{ node: '💓 Health Check', type: 'main', index: 0 }],            // output 7 = health
      ],
    },
    '⚠️ Handle Invalid Action': { main: [[{ node: '📤 Respond to Client', type: 'main', index: 0 }]] },
    '🐛 Start Bug Fix':         { main: [[{ node: '📤 Respond to Client', type: 'main', index: 0 }]] },
    '📊 Check Run Status':      { main: [[{ node: '📤 Respond to Client', type: 'main', index: 0 }]] },
    '✅ Approve Run':           { main: [[{ node: '📤 Respond to Client', type: 'main', index: 0 }]] },
    '❌ Reject Run':            { main: [[{ node: '📤 Respond to Client', type: 'main', index: 0 }]] },
    '📦 Create GitHub PR':      { main: [[{ node: '📤 Respond to Client', type: 'main', index: 0 }]] },
    '🚫 Cancel Run':            { main: [[{ node: '📤 Respond to Client', type: 'main', index: 0 }]] },
    '💓 Health Check':          { main: [[{ node: '📤 Respond to Client', type: 'main', index: 0 }]] },
  },
  pinData: {},
  settings: { executionOrder: 'v1' },
  staticData: null,
  tags: [{ name: 'bugfix-demo' }, { name: 'dashboard' }],
  meta: { templateCredsSetupCompleted: false },
};

const controlPanelWorkflow = {
  name: 'Bugfix Control Panel',
  nodes: [
    {
      parameters: {
        httpMethod: 'GET',
        path: 'bugfix-panel',
        responseMode: 'responseNode',
        options: {},
      },
      id: 'panel-get-001',
      name: 'Panel: GET',
      type: 'n8n-nodes-base.webhook',
      typeVersion: 2,
      position: [240, 200],
      webhookId: 'bugfix-panel-get',
    },
    {
      parameters: { mode: 'runOnceForAllItems', jsCode: panelPageCode },
      id: 'panel-html-001',
      name: 'Build HTML',
      type: 'n8n-nodes-base.code',
      typeVersion: 2,
      position: [480, 200],
    },
    {
      parameters: {
        respondWith: 'text',
        responseBody: '={{ $json.html }}',
        options: { responseHeaders: { entries: [{ name: 'Content-Type', value: 'text/html; charset=utf-8' }] } },
      },
      id: 'panel-respond-html-001',
      name: 'Respond HTML',
      type: 'n8n-nodes-base.respondToWebhook',
      typeVersion: 1.1,
      position: [720, 200],
    },
    {
      parameters: {
        httpMethod: 'POST',
        path: 'bugfix-action',
        responseMode: 'responseNode',
        options: {},
      },
      id: 'panel-post-001',
      name: 'Panel: POST action',
      type: 'n8n-nodes-base.webhook',
      typeVersion: 2,
      position: [240, 420],
      webhookId: 'bugfix-panel-action',
    },
    {
      parameters: { mode: 'runOnceForAllItems', jsCode: panelActionCode },
      id: 'panel-action-001',
      name: 'Run action',
      type: 'n8n-nodes-base.code',
      typeVersion: 2,
      position: [480, 420],
    },
    {
      parameters: {
        respondWith: 'json',
        responseBody: '={{ { response: $json.response, runId: $json.runId } }}',
        options: {},
      },
      id: 'panel-respond-json-001',
      name: 'Respond JSON',
      type: 'n8n-nodes-base.respondToWebhook',
      typeVersion: 1.1,
      position: [720, 420],
    },
  ],
  connections: {
    'Panel: GET': {
      main: [[{ node: 'Build HTML', type: 'main', index: 0 }]],
    },
    'Build HTML': {
      main: [[{ node: 'Respond HTML', type: 'main', index: 0 }]],
    },
    'Panel: POST action': {
      main: [[{ node: 'Run action', type: 'main', index: 0 }]],
    },
    'Run action': {
      main: [[{ node: 'Respond JSON', type: 'main', index: 0 }]],
    },
  },
  pinData: {},
  settings: { executionOrder: 'v1' },
  staticData: null,
  tags: [{ name: 'bugfix-demo' }],
  meta: { templateCredsSetupCompleted: false },
};

fs.writeFileSync(path.join(root, 'bugfix-control-panel.json'), JSON.stringify(controlPanelWorkflow, null, 2));
fs.writeFileSync(path.join(root, 'bugfix-dashboard.json'), JSON.stringify(dashboardWorkflow, null, 2));
console.log('Wrote bugfix-webhook-demo.json');
console.log('Wrote bugfix-chat-demo.json (n8n 1.82 — no Respond to Chat node)');
console.log('Wrote bugfix-control-panel.json (legacy single-node panel)');
console.log('Wrote bugfix-dashboard.json ✨ (new: Switch routing + tabbed HTML dashboard)');

// Validate the served dashboard's <script> body parses cleanly in a browser.
import('./validate-dashboard.js').catch(err => {
  console.error('Dashboard validation failed:', err.message);
  process.exit(1);
});
