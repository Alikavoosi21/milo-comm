const secretPattern = /(sk-[A-Za-z0-9_-]+|bearer\s+\S+)/gi;

export function redact(value: unknown) {
  return String(value).replace(secretPattern, "[REDACTED]");
}

export function logEvent(event: string, metadata: Record<string, unknown> = {}) {
  console.info(JSON.stringify({ event, ...Object.fromEntries(Object.entries(metadata).map(([key, value]) => [key, redact(value)])), at: new Date().toISOString() }));
}
