import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { Home } from 'lucide-react';
import { requestPasswordReset } from '@/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

export default function PasswordResetRequestPage() {
  const [email, setEmail] = useState('');
  const [pending, setPending] = useState(false);
  const [error, setError] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const requestRef = useRef(null);

  useEffect(() => () => requestRef.current?.abort(), []);

  const submit = async event => {
    event.preventDefault();
    setPending(true);
    setError('');
    const controller = new AbortController();
    requestRef.current = controller;
    try {
      await requestPasswordReset(email.trim().toLowerCase(), { signal: controller.signal });
      if (!controller.signal.aborted) setSubmitted(true);
    } catch (failure) {
      if (!controller.signal.aborted) setError(failure.message || 'The request could not be completed. Please try again.');
    } finally {
      if (!controller.signal.aborted) setPending(false);
    }
  };

  return <main className="min-h-screen bg-slate-50 px-4 py-8 sm:px-6 md:flex md:items-center md:py-12">
    <section className="mx-auto w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 sm:p-10">
      <Link to="/" aria-label="PlanSoko home" className="mb-10 inline-flex min-h-11 items-center gap-2 rounded-lg font-semibold text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"><Home aria-hidden="true" className="h-6 w-6 text-primary" />PlanSoko home</Link>
      <h1 className="text-3xl font-bold tracking-tight text-slate-900">Reset your password</h1>
      {submitted ? <div className="mt-5 space-y-5">
        <p role="status" className="text-sm leading-6 text-slate-700">If an account exists for that email, a password reset link has been sent. Check your inbox and follow the link to choose a new password.</p>
        <Link to="/signUp?mode=login" className="inline-flex min-h-11 items-center rounded-md text-sm font-medium text-primary underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">Return to sign in</Link>
      </div> : <>
        <p className="mt-2 text-sm leading-6 text-slate-600">Enter your email and we’ll send instructions if it belongs to a PlanSoko account.</p>
        {error && <p role="alert" className="mt-5 whitespace-pre-line rounded-lg border border-destructive bg-red-50 p-3 text-sm text-destructive">{error}</p>}
        <form onSubmit={submit} aria-busy={pending} className="mt-6 space-y-4">
          <div className="space-y-2"><label htmlFor="reset-email" className="ui-label">Email Address</label><Input id="reset-email" name="email" type="email" autoComplete="email" required value={email} onChange={event => setEmail(event.target.value)} disabled={pending} /></div>
          {pending && <p role="status" className="text-sm text-slate-600">Sending reset instructions…</p>}
          <Button type="submit" disabled={pending} className="w-full">{pending ? 'Please wait…' : 'Send reset link'}</Button>
        </form>
        <Link to="/signUp?mode=login" className="mt-5 inline-flex min-h-11 items-center rounded-md text-sm font-medium text-primary underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">Back to sign in</Link>
      </>}
    </section>
  </main>;
}
