import React from 'react';
import { Link, Navigate, Outlet, useNavigate } from 'react-router-dom';
import { Home, LogOut } from 'lucide-react';
import SideNav from '@/components/sideNav';
import MobileNav from '@/components/MobileNav';

export default function SellerDashboard() {
  const navigate = useNavigate();
  let user;
  try { user = JSON.parse(localStorage.getItem('user')); } catch { user = null; }
  if (!localStorage.getItem('accessToken') || user?.role !== 'seller') return <Navigate to="/" replace />;
  const logout = () => {
    for (const key of ['accessToken','refreshToken','user']) localStorage.removeItem(key);
    navigate('/', {replace:true});
  };
  return <div className="flex min-h-screen bg-slate-50 font-sans">
    <SideNav user={user} onLogout={logout} />
    <div className="min-w-0 flex-1">
      <header className="border-b border-slate-200 bg-white px-4 py-3 md:hidden">
        <div className="flex items-center justify-between gap-3">
          <Link to="/" aria-label="PlanSoko home" className="flex min-h-11 items-center gap-2 rounded-lg font-bold text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"><Home aria-hidden="true" className="h-6 w-6 text-primary" />PlanSoko</Link>
          <button type="button" onClick={logout} className="flex min-h-11 items-center gap-2 rounded-lg px-3 text-sm text-slate-600 hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"><LogOut aria-hidden="true" className="h-4 w-4" />Log out</button>
        </div>
        <p className="mt-1 break-words text-xs text-slate-500">Designer workspace · <span className="font-medium text-slate-700">{user.name || 'Seller'}</span></p>
      </header>
      <main className="mx-auto w-full max-w-7xl pb-[calc(5rem+env(safe-area-inset-bottom))] md:pb-8"><Outlet /></main>
    </div>
    <MobileNav onLogout={logout} />
  </div>;
}
