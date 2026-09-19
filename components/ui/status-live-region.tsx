export function StatusLiveRegion({ status }: { status?: string }) {
  return <div aria-live="polite" aria-atomic="true" className="status-line">{status}</div>;
}
