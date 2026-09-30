import { useEffect, useId, useRef, useState } from 'react';
import { registerUser, loginUser } from '@/api';
import { session } from '@/lib/session';
import { Button } from './ui/button';
import { Input } from './ui/input';

export default function AuthForm({ initialMode = 'login', onSuccess, onPendingChange, titleId, headingLevel = 'h2' }) {
  const id = useId();
  const [mode, setMode] = useState(initialMode);
  const [fields, setFields] = useState({ name: '', email: '', password: '' });
  const [pending, setPending] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState(() => session.getSnapshot().reason === 'expired' ? 'Your sign-in has expired. Please sign in again.' : '');
  const requestRef = useRef(null);
  const busyRef = useRef(false);
  const isLogin = mode === 'login';
  const Heading = headingLevel;

  useEffect(() => () => requestRef.current?.abort(), []);

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (busyRef.current) return;
    if (!isLogin && !fields.name.trim()) {
      setError('Enter your full name.');
      event.currentTarget.elements.name.focus();
      return;
    }
    session.sync();
    const expectedSession = session.getSnapshot();
    busyRef.current = true;
    const controller = new AbortController();
    requestRef.current = controller;
    setPending(true);
    onPendingChange?.(true);
    setError('');
    const credentials = { email: fields.email.trim().toLowerCase(), password: fields.password };
    try {
      if (!isLogin) {
        await registerUser({ name: fields.name.trim(), ...credentials }, { signal: controller.signal });
        if (controller.signal.aborted) return;
        // Once creation succeeds, every retry must log in rather than register again.
        setMode('login');
        setNotice('Your seller account has been created. Signing you in…');
      }
      const data = await loginUser(credentials, { signal: controller.signal });
      if (controller.signal.aborted) return;
      const user = session.login(data, expectedSession);
      setFields({ name: '', email: '', password: '' });
      onSuccess?.(user);
    } catch (failure) {
      if (controller.signal.aborted) return;
      // The API helper supplies readable validation/network messages and masks server failures.
      setError(failure.message || 'The request could not be completed. Please try again.');
      if (!isLogin) setNotice(current => current ? 'Your seller account was created, but sign-in did not finish. Sign in below.' : '');
    } finally {
      busyRef.current = false;
      if (!controller.signal.aborted) {
        setPending(false);
        onPendingChange?.(false);
      }
    }
  };

  const update = (event) => setFields(current => ({ ...current, [event.target.name]: event.target.value }));
  return <div className="min-w-0 space-y-6">
    <div>
      <Heading id={titleId} className="text-3xl font-bold tracking-tight text-slate-900">{isLogin ? 'Welcome Back' : 'Create Account'}</Heading>
      <p className="mt-2 text-sm leading-6 text-slate-600">{isLogin ? 'Sign in to manage your house plans.' : 'Create a seller account to upload and manage your house plans.'}</p>
    </div>
    {notice && <p role="status" className="text-sm leading-6 text-slate-700">{notice}</p>}
    {error && <p id={`${id}-error`} role="alert" className="whitespace-pre-line rounded-lg border border-destructive bg-red-50 p-3 text-sm text-destructive">{error}</p>}
    <form onSubmit={handleSubmit} aria-busy={pending} aria-describedby={error ? `${id}-error` : undefined} className="space-y-4">
      {!isLogin && <div className="space-y-2">
        <label htmlFor={`${id}-name`} className="ui-label">Full Name</label>
        <Input id={`${id}-name`} name="name" autoComplete="name" required value={fields.name} onChange={update} disabled={pending} />
      </div>}
      <div className="space-y-2">
        <label htmlFor={`${id}-email`} className="ui-label">Email Address</label>
        <Input id={`${id}-email`} name="email" type="email" autoComplete="username" required value={fields.email} onChange={update} disabled={pending} />
      </div>
      <div className="space-y-2">
        <label htmlFor={`${id}-password`} className="ui-label">Password</label>
        <Input id={`${id}-password`} name="password" type="password" autoComplete={isLogin ? 'current-password' : 'new-password'} required value={fields.password} onChange={update} disabled={pending} />
      </div>
      {pending && <p role="status" className="text-sm text-slate-600">Please wait while we complete your request.</p>}
      <Button type="submit" disabled={pending} className="w-full">{pending ? 'Please wait…' : isLogin ? 'Sign In' : 'Create Account'}</Button>
    </form>
    <div className="flex flex-wrap items-center gap-x-2 text-sm text-slate-600">
      <span>{isLogin ? "Don't have an account?" : 'Already have an account?'}</span>
      <Button type="button" variant="link" disabled={pending} onClick={() => {
        setMode(isLogin ? 'register' : 'login');
        setFields(current => ({ ...current, password: '' }));
        setError('');
        setNotice('');
      }}>{isLogin ? 'Sign Up' : 'Log In'}</Button>
    </div>
  </div>;
}
