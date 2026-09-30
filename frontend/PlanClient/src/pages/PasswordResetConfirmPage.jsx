import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { Home } from 'lucide-react';
import { confirmPasswordReset } from '@/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

export default function PasswordResetConfirmPage() {
  const { uid, token } = useParams();
  const navigate = useNavigate();
  const [password, setPassword] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [pending, setPending] = useState(false);
  const [error, setError] = useState('');
  const requestRef = useRef(null);

  useEffect(() => () => requestRef.current?.abort(), []);

  const submit = async event => {
    event.preventDefault();
    if (password !== confirmation) {
      setError('The passwords do not match.');
      return;
    }
    setPending(true);
    setError('');
    const controller = new AbortController();
    requestRef.current = controller;
    try {
      await confirmPasswordReset(uid, token, password, { signal: controller.signal });
      if (!controller.signal.aborted) navigate('/signUp?mode=login&reset=success', { replace: true });
    } catch (failure) {
      if (!controller.signal.aborted) setError(failure.message || 'This password reset link is invalid or has expired.');
    } finally {
      if (!controller.signal.aborted) setPending(false);
    }
  };

  return <main className="min-h-screen bg-slate-50 px-4 py-8 sm:px-6 md:flex md:items-center md:py-12">
    <section className="mx-auto w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 sm:p-10">
      <Link to="/" aria-label="PlanSoko home" className="mb-10 inline-flex min-h-11 items-center gap-2 rounded-lg font-semibold text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"><Home aria-hidden="true" className="h-6 w-6 text-primary" />PlanSoko home</Link>
      <h1 className="text-3xl font-bold tracking-tight text-slate-900">Choose a new password</h1>
      <p className="mt-2 text-sm leading-6 text-slate-600">Use a password you have not used elsewhere.</p>
      {error && <p role="alert" className="mt-5 whitespace-pre-line rounded-lg border border-destructive bg-red-50 p-3 text-sm text-destructive">{error}</p>}
      <form onSubmit={submit} aria-busy={pending} className="mt-6 space-y-4">
        <div className="space-y-2"><label htmlFor="new-password" className="ui-label">New Password</label><Input id="new-password" name="new_password" type="password" autoComplete="new-password" required value={password} onChange={event => setPassword(event.target.value)} disabled={pending} /></div>
        <div className="space-y-2"><label htmlFor="confirm-password" className="ui-label">Confirm New Password</label><Input id="confirm-password" name="confirm_password" type="password" autoComplete="new-password" required value={confirmation} onChange={event => setConfirmation(event.target.value)} disabled={pending} /></div>
        {pending && <p role="status" className="text-sm text-slate-600">Saving your new password…</p>}
        <Button type="submit" disabled={pending} className="w-full">{pending ? 'Please wait…' : 'Set new password'}</Button>
      </form>
    </section>
  </main>;
}
