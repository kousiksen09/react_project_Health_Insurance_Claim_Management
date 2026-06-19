export function parseStructuredSections(text: string): {
  summary?: string;
  rootCause?: string;
} {
  const summaryMatch = text.match(/##\s*Summary\s*\n+([\s\S]*?)(?=\n##\s+|\s*$)/i);
  const rootCauseMatch = text.match(/##\s*Root\s*Cause\s*\n+([\s\S]*?)(?=\n##\s+|\s*$)/i);

  return {
    summary: summaryMatch?.[1]?.trim(),
    rootCause: rootCauseMatch?.[1]?.trim(),
  };
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
