/**
 * Parses a comma-separated bed label list that also accepts numeric ranges,
 * e.g. "1,2,3,101-111,300-307" -> ["1","2","3","101",...,"111","300",...,"307"].
 */
export function parseBedLabels(input: string): string[] {
  const labels: string[] = [];
  for (const token of input.split(',').map((t) => t.trim()).filter(Boolean)) {
    const rangeMatch = token.match(/^(\d+)\s*-\s*(\d+)$/);
    if (rangeMatch) {
      const start = Number(rangeMatch[1]);
      const end = Number(rangeMatch[2]);
      for (let n = start; n <= end; n++) labels.push(String(n));
    } else {
      labels.push(token);
    }
  }
  return labels;
}
