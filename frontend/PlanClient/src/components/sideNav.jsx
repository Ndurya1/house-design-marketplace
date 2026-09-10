import React from 'react';
import { Link, NavLink } from 'react-router-dom';
import { Home, LogOut, User } from 'lucide-react';
import { dashboardLinks } from '@/lib/dashboardNavigation';

export default function SideNav({user,onLogout}) {
  return <aside className="sticky top-0 hidden h-dvh w-56 shrink-0 flex-col overflow-y-auto border-r border-slate-200 bg-white p-4 md:flex lg:w-64">
    <Link to="/" aria-label="PlanSoko home" className="mb-8 flex min-h-12 items-center gap-2 rounded-lg text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary">
      <Home aria-hidden="true" className="h-7 w-7 text-primary" /><span className="text-xl font-bold tracking-tight">PlanSoko</span>
    </Link>
    <p className="mb-3 px-3 text-xs font-semibold uppercase tracking-wider text-slate-400">Designer workspace</p>
    <nav aria-label="Dashboard navigation" className="grid gap-2">
      {dashboardLinks.map(({to,label,icon,end}) => <NavLink key={to} to={to} end={end}
        className={({isActive}) => `flex min-h-12 items-center gap-3 rounded-xl px-3 text-sm font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary ${isActive ? 'bg-blue-50 text-blue-700' : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'}`}>
        {React.createElement(icon, { 'aria-hidden': true, className: 'h-5 w-5 shrink-0' })}{label}
      </NavLink>)}
    </nav>
    <div className="mt-auto pt-8">
      <div className="flex items-start gap-3 border-t border-slate-200 pt-4">
        <User aria-hidden="true" className="h-10 w-10 shrink-0 rounded-full bg-blue-50 p-2 text-primary" />
        <div className="min-w-0"><p className="break-words text-sm font-semibold text-slate-900">{user?.name || 'Seller'}</p><p className="mt-1 text-xs text-slate-500">Designer</p></div>
      </div>
      <button type="button" onClick={onLogout} className="mt-3 flex min-h-11 w-full items-center gap-3 rounded-lg px-3 text-sm font-medium text-slate-600 hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"><LogOut aria-hidden="true" className="h-4 w-4" />Log out</button>
    </div>
  </aside>;
}
