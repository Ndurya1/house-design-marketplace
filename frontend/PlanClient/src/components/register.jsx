import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { Home } from 'lucide-react';
import AuthForm from './AuthForm';
import { useSession } from '@/lib/useSession';

export default function Register() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { reason } = useSession();
  const resetSuccess = searchParams.get('reset') === 'success';
  const initialMode = searchParams.get('mode') === 'login' || reason === 'expired' ? 'login' : 'register';
  return <main className="min-h-screen bg-slate-50 px-4 py-8 sm:px-6 md:flex md:items-center md:py-12">
    <div className="mx-auto grid w-full max-w-5xl overflow-hidden rounded-2xl border border-slate-200 bg-white md:grid-cols-2">
      <section className="bg-blue-700 p-6 text-white sm:p-10 md:flex md:flex-col md:justify-between">
        <Link to="/" className="inline-flex min-h-11 items-center gap-2 self-start rounded-lg font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"><Home aria-hidden="true" className="h-6 w-6" />PlanSoko home</Link>
        <div className="mt-8 md:my-16">
          <p className="text-3xl font-bold leading-tight tracking-tight sm:text-4xl">Bring your house plans to more buyers.</p>
          <p className="mt-4 max-w-sm text-base leading-7 text-blue-100">Create a seller account to upload your designs and manage your storefront.</p>
        </div>
      </section>
      <section aria-label="Seller account access" className="min-w-0 p-6 sm:p-10">
        <AuthForm initialMode={initialMode} initialNotice={resetSuccess ? 'Your password has been reset. Sign in with your new password.' : ''} headingLevel="h1" onSuccess={user => navigate(user.role === 'seller' ? '/dashboard' : '/', { replace: true })} />
      </section>
    </div>
  </main>;
}
