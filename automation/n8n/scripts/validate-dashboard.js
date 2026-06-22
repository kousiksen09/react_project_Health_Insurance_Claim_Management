// Validates the served dashboard HTML's <script> body by node-parsing it.
// Reads bugfix-dashboard.json, finds the Build Dashboard Page node,
// runs its jsCode in a sandbox to obtain the final HTML, then extracts
// and parses the inner <script>...</script> with new Function() to catch
// any SyntaxError that would crash the browser.

import fs from 'node:fs';
import path from 'node:path';
import url from 'node:url';
import vm from 'node:vm';

const __dirname = path.dirname(url.fileURLToPath(import.meta.url));
const jsonPath = path.join(__dirname, '..', 'bugfix-dashboard.json');
const wf = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));

const node = wf.nodes.find(n => n.name === 'Build Dashboard Page');
if (!node) { console.error('Build Dashboard Page node not found'); process.exit(1); }

const jsCode = node.parameters.jsCode;
const ctx = { console, $input: { all: () => [] }, $json: {}, $node: {}, $: () => ({}) };
vm.createContext(ctx);
const wrapped = '(function(){' + jsCode + '})()';
let result;
try {
  result = vm.runInContext(wrapped, ctx);
} catch (e) {
  console.error('Code node body itself failed to run:', e.message);
  process.exit(1);
}

const html = result?.[0]?.json?.html;
if (!html) { console.error('No html returned'); process.exit(1); }

const scriptMatch = html.match(/<script>([\s\S]*?)<\/script>/);
if (!scriptMatch) { console.error('No <script> tag found in HTML'); process.exit(1); }

const scriptBody = scriptMatch[1];

try {
  new Function(scriptBody);
  console.log('OK: dashboard <script> body parses cleanly (' + scriptBody.length + ' chars).');
} catch (e) {
  console.error('SyntaxError in served <script>:', e.message);
  const lines = scriptBody.split('\n');
  const m = e.message.match(/position (\d+)/) || e.stack?.match(/<anonymous>:(\d+):/);
  if (m) {
    const lineNum = parseInt(m[1], 10);
    const start = Math.max(0, lineNum - 3);
    const end = Math.min(lines.length, lineNum + 3);
    for (let i = start; i < end; i++) {
      const marker = i + 1 === lineNum ? '>>> ' : '    ';
      console.error(marker + (i + 1) + ': ' + lines[i]);
    }
  }
  process.exit(2);
}
