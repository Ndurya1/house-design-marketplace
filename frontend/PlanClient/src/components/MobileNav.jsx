import React from 'react';
import { NavLink } from 'react-router-dom';
import { dashboardLinks } from '@/lib/dashboardNavigation';

export default function MobileNav() {
  return <nav aria-label="Dashboard mobile navigation" className="fixed inset-x-0 bottom-0 z-40 border-t border-slate-200 bg-white pb-[env(safe-area-inset-bottom)] shadow-sm md:hidden">
    <div className="grid h-16 grid-cols-3 gap-1 px-2">
      {dashboardLinks.map(({to,label,icon,end}) => <NavLink key={to} to={to} end={end}
        className={({isActive}) => `my-1 flex min-w-0 flex-col items-center justify-center gap-1 rounded-xl px-1 text-xs font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-inset ${isActive ? 'bg-blue-50 text-blue-700' : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900'}`}>
        {React.createElement(icon, { 'aria-hidden': true, className: 'h-5 w-5' })}<span>{label}</span>
      </NavLink>)}
    </div>
  </nav>;
}
