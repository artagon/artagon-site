// LAYOUT-13: share clamp recognition with the non-change scratch negative control.
export interface ClampFinding {
  file: string;
  line: number;
  match: string;
}

export function findInvalidClamps(body: string, rel: string): ClampFinding[] {
  let stripped = body.replace(/\/\*[\s\S]*?\*\//g, (m) =>
    m.replace(/[^\n]/g, " "),
  );
  if (rel.endsWith(".astro") || rel.endsWith(".tsx") || rel.endsWith(".jsx")) {
    stripped = stripped.replace(/\/\/[^\n]*/g, (m) => m.replace(/./g, " "));
  }
  const findings: ClampFinding[] = [];
  const re = /clamp\(([^()]*(?:\([^()]*\)[^()]*)*)\)/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(stripped)) !== null) {
    const args = m[1]!.split(",");
    for (const arg of args) {
      const trimmed = arg.trim();
      if (/[a-z0-9)]\s*[+\-]\s*[a-z0-9.]/i.test(trimmed)) {
        if (!/^\s*calc\(/i.test(trimmed)) {
          const before = stripped.slice(0, m.index);
          const line = before.split("\n").length;
          findings.push({ file: rel, line, match: m[0] });
          break;
        }
      }
    }
  }
  return findings;
}
