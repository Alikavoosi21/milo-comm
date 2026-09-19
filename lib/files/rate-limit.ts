const attempts = new Map<string, number[]>();
export function allowUpload(ownerId: string, now = Date.now()) {
  const recent = (attempts.get(ownerId) ?? []).filter((value) => now - value < 60_000);
  if (recent.length >= 10) return false;
  recent.push(now); attempts.set(ownerId, recent); return true;
}
