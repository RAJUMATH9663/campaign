export function renderTemplate(
  content: string,
  vars: Record<string, string | undefined | null>
): string {
  return content.replace(/\{\{\s*(\w+)\s*\}\}/g, (_match, key: string) => {
    const value = vars[key];
    return value !== undefined && value !== null ? String(value) : `{{${key}}}`;
  });
}

export function extractVariables(content: string): string[] {
  const matches = content.matchAll(/\{\{\s*(\w+)\s*\}\}/g);
  const set = new Set<string>();
  for (const m of matches) set.add(m[1]);
  return Array.from(set);
}
