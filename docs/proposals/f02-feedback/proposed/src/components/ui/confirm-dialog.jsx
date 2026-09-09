import { useEffect, useId, useRef } from 'react';
import { Button } from './button';
import { Feedback } from './feedback';

// Mount while open. Native showModal provides focus containment and an inert background.
export function ConfirmDialog({ title, description, confirmLabel, busyLabel = 'Working…', errorTitle = 'Action failed', busy = false, error, onCancel, onConfirm, returnFocusRef }) {
  const dialogRef = useRef(null);
  const cancelRef = useRef(null);
  const pendingRef = useRef(false);
  const titleId = useId();
  const descriptionId = useId();

  useEffect(() => {
    const dialog = dialogRef.current;
    const trigger = document.activeElement;
    const fallback = returnFocusRef?.current;
    const previousOverflow = document.body.style.overflow;
    dialog.showModal();
    document.body.style.overflow = 'hidden';
    cancelRef.current.focus();
    return () => {
      dialog.close();
      document.body.style.overflow = previousOverflow;
      const target = trigger?.isConnected ? trigger : fallback;
      target?.focus();
    };
  }, [returnFocusRef]);

  const confirm = async () => {
    if (pendingRef.current || busy) return;
    pendingRef.current = true;
    try { await onConfirm(); }
    finally { pendingRef.current = false; }
  };

  return (
    <dialog
      ref={dialogRef}
      aria-labelledby={titleId}
      aria-describedby={descriptionId}
      aria-busy={busy}
      onCancel={(event) => {
        event.preventDefault();
        if (!busy && !pendingRef.current) onCancel();
      }}
      className="m-auto max-h-[calc(100dvh-2rem)] w-[calc(100%-2rem)] max-w-md overflow-y-auto rounded-dialog border border-border bg-card p-6 text-card-foreground shadow-xl backdrop:bg-slate-900/60"
    >
      <h2 id={titleId} className="ui-section-title break-words">{title}</h2>
      <p id={descriptionId} className="mt-2 text-sm text-muted-foreground">{description}</p>
      {error && <div className="mt-4"><Feedback kind="error" title={errorTitle} description={error} /></div>}
      {busy && <p role="status" className="mt-4 text-sm text-muted-foreground">{busyLabel}</p>}
      <div className="mt-6 flex flex-wrap justify-end gap-3">
        <Button ref={cancelRef} type="button" variant="outline" aria-disabled={busy} className="aria-disabled:opacity-50" onClick={() => {
          if (!busy && !pendingRef.current) onCancel();
        }}>Cancel</Button>
        <Button type="button" variant="destructive" aria-disabled={busy} className="aria-disabled:opacity-50" onClick={confirm}>
          {busy ? busyLabel : confirmLabel}
        </Button>
      </div>
    </dialog>
  );
}
