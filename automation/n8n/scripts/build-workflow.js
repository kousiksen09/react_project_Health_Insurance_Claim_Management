/**
 * Regenerate importable n8n workflow JSON files.
 * Usage: node scripts/build-workflow.js
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
console.log('Wrote bugfix-webhook-demo.json');
console.log('Wrote bugfix-chat-demo.json (n8n 1.82 — no Respond to Chat node)');
console.log('Wrote bugfix-control-panel.json (UI for status / approve / reject)');
