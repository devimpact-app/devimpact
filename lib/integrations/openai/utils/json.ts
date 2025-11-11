export function safeJson<T>(s: string): T {
  try {
    return JSON.parse(s) as T;
  } catch {
    // Defensive: sometimes models put stray text—try to extract {...}
    const start = s.indexOf("{");
    const end = s.lastIndexOf("}");
    if (start >= 0 && end > start) {
      try {
        return JSON.parse(s.slice(start, end + 1)) as T;
      } catch {}
    }
    throw new Error("AI response was not valid JSON");
  }
}
