"use client";

import { useState } from "react";

export function MessageEditor({ initial, onCancel, onSave }: { initial: string; onCancel(): void; onSave(value: string): Promise<void> }) {
  const [value, setValue] = useState(initial); const [busy, setBusy] = useState(false);
  return <div className="message-editor"><textarea value={value} onChange={(e) => setValue(e.target.value)} /><div><button onClick={onCancel}>انصراف</button><button className="primary-small" disabled={busy || !value.trim()} onClick={async () => { setBusy(true); await onSave(value.trim()); setBusy(false); }}>ذخیره و تولید دوباره</button></div></div>;
}
