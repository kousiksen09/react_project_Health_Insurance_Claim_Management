/**
 * Extract structured sections from the Cursor agent's final assistant message.
 *
 * The agent is prompted to end with:
 *   ## Summary
 *   ## Root Cause
 *
 * But agents sometimes use ##, ###, or #### and may include extra spaces.
 * Both patterns are handled here.
 */
export function parseStructuredSections(text: string): {
  summary?: string;
  rootCause?: string;
} {
  // Match ## through #### headings with optional whitespace, case-insensitive
  const headingBoundary = /\n#{2,4}\s+/;

  const summaryMatch = text.match(/#{2,4}\s*Summary\s*\n+([\s\S]*?)(?=\n#{1,4}\s+|\s*$)/i);
  const rootCauseMatch = text.match(/#{2,4}\s*Root\s*Cause\s*\n+([\s\S]*?)(?=\n#{1,4}\s+|\s*$)/i);

  // Fallback: look for bold labels like "**Summary:**" in case agent skips headings
  const boldSummaryMatch = !summaryMatch
    ? text.match(/\*\*Summary[:\s]*\*\*\s*\n?([\s\S]*?)(?=\*\*Root Cause|\n#{1,4}\s+|\s*$)/i)
    : null;
  const boldRootCauseMatch = !rootCauseMatch
    ? text.match(/\*\*Root Cause[:\s]*\*\*\s*\n?([\s\S]*?)(?=\n#{1,4}\s+|\s*$)/i)
    : null;

  void headingBoundary;

  const summary = (summaryMatch?.[1] ?? boldSummaryMatch?.[1])?.trim();
  const rootCause = (rootCauseMatch?.[1] ?? boldRootCauseMatch?.[1])?.trim();

  return { summary, rootCause };
}

export function extractAssistantText(content: unknown): string {
  if (!Array.isArray(content)) return '';
  return content
    .map((block) => {
      if (block && typeof block === 'object' && 'type' in block && block.type === 'text' && 'text' in block) {
        return String(block.text);
      }
      return '';
    })
    .join('');
}

/**
 * Cursor SDK streaming emits many small assistant deltas. They must be concatenated
 * with no separator — joining with `\n` injects literal newlines into JSON/XML output
 * and breaks parsing (e.g. `"summary\n": "..."` inside a <PLAN> block).
 * Prefer `waitResult` when present; it is the authoritative final message.
 */
export function mergeAssistantStream(chunks: string[], waitResult?: string | null): string {
  const final = waitResult?.trim();
  if (final) return final;
  return chunks.join('').trim();
}
