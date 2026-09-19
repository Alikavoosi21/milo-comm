"use client";

import { useEffect, useId, useRef } from "react";

interface ConfirmDialogProps {
  open: boolean;
  title: string;
  description: string;
  confirmLabel: string;
  pending?: boolean;
  error?: string;
  onCancel(): void;
  onConfirm(): void;
}

export function ConfirmDialog({ open, title, description, confirmLabel, pending = false, error = "", onCancel, onConfirm }: ConfirmDialogProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const cancelRef = useRef<HTMLButtonElement>(null);
  const titleId = useId();
  const descriptionId = useId();

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (open && !dialog.open) {
      dialog.showModal();
      queueMicrotask(() => cancelRef.current?.focus());
    } else if (!open && dialog.open) {
      dialog.close();
    }
  }, [open]);

  return <dialog
    ref={dialogRef}
    className="confirm-dialog"
    role="alertdialog"
    aria-labelledby={titleId}
    aria-describedby={descriptionId}
    onCancel={(event) => { event.preventDefault(); if (!pending) onCancel(); }}
  >
    <h2 id={titleId}>{title}</h2>
    <p id={descriptionId}>{description}</p>
    {error && <p className="dialog-error" role="alert">{error}</p>}
    <div className="dialog-actions">
      <button ref={cancelRef} type="button" onClick={onCancel} disabled={pending}>انصراف</button>
      <button className="danger-button" type="button" onClick={onConfirm} disabled={pending}>
        {pending ? "در حال حذف…" : confirmLabel}
      </button>
    </div>
  </dialog>;
}
