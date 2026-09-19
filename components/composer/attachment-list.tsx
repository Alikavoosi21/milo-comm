export function AttachmentList({ items, error, onRemove }: { items: { id: string; originalName: string }[]; error?: string; onRemove(id: string): void }) {
  return <div aria-live="polite">
    {error && <div className="attachment-error"><strong>فایل پذیرفته نشد</strong><p>{error}</p></div>}
    {!!items.length && <div className="attachment-list">{items.map((item) => <span className="attachment-chip" key={item.id}>📄 {item.originalName}<button type="button" onClick={() => onRemove(item.id)} aria-label={`حذف ${item.originalName}`}>×</button></span>)}</div>}
  </div>;
}
