import { useEffect, useId, useRef, useState } from 'react';
import { X } from 'lucide-react';
import AuthForm from './AuthForm';
import { Button } from './ui/button';

function OpenAuthDialog({ onClose, onSuccess, initialMode }) {
  const dialogRef = useRef(null);
  const pendingRef = useRef(false);
  const [pending, setPending] = useState(false);
  const titleId = useId();

  useEffect(() => {
    const dialog = dialogRef.current;
    const trigger = document.activeElement;
    const previousOverflow = document.body.style.overflow;
    dialog.showModal();
    document.body.style.overflow = 'hidden';
    dialog.querySelector('input')?.focus();
    return () => {
      dialog.close();
      document.body.style.overflow = previousOverflow;
      const visible = element => element?.isConnected && element.getClientRects().length > 0;
      // The mobile menu trigger can disappear when opening authentication.
      const fallback = document.querySelector('button[aria-controls="mobile-navigation"]');
      if (visible(trigger)) trigger.focus();
      else if (visible(fallback)) fallback.focus();
    };
  }, []);

  const close = () => { if (!pendingRef.current) onClose(); };
  return <dialog ref={dialogRef} aria-labelledby={titleId} aria-busy={pending} onCancel={event => { event.preventDefault(); close(); }} className="m-auto max-h-[calc(100dvh-2rem)] w-[calc(100%-2rem)] max-w-md overflow-y-auto rounded-dialog border border-border bg-white p-6 text-slate-900 shadow-xl backdrop:bg-slate-900/60 sm:p-8">
    <div className="mb-3 flex justify-end">
      <Button type="button" variant="ghost" size="icon" aria-label="Close authentication dialog" aria-disabled={pending} onClick={close} className="aria-disabled:opacity-50"><X aria-hidden="true" className="h-5 w-5" /></Button>
    </div>
    <AuthForm initialMode={initialMode} titleId={titleId} onPendingChange={value => { pendingRef.current = value; setPending(value); }} onSuccess={user => {
      onSuccess?.(user);
      onClose();
    }} />
  </dialog>;
}

export default function AuthModal({ isOpen, onClose, onSuccess, initialMode = 'login' }) {
  return isOpen ? <OpenAuthDialog key={initialMode} initialMode={initialMode} onClose={onClose} onSuccess={onSuccess} /> : null;
}
