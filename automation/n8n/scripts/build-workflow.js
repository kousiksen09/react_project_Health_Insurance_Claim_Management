/**
 * Deprecated — legacy per-workflow JSON files were merged into one import.
 *
 * Import this file in n8n instead:
 *   automation/n8n/sdlc-automation-all-in-one.json
 *
 * Source scripts under automation/n8n/scripts/ remain for reference when editing
 * Code nodes in the all-in-one workflow.
 */
console.error(
  'build-workflow.js is deprecated.\n' +
  'Import automation/n8n/sdlc-automation-all-in-one.json in n8n (single workflow).\n' +
  'Edit Code nodes in that JSON directly, or update the matching scripts/*.js files for reference.',
);
process.exit(1);
