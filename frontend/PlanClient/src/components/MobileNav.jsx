import React, { useEffect, useRef, useState } from 'react';
import { NavLink } from 'react-router-dom';
import { ChevronUp, DollarSign, LogOut, Settings } from 'lucide-react';
import { dashboardLinks } from '@/lib/dashboardNavigation';

export default function MobileNav({ onLogout }) {
  const [moreOpen, setMoreOpen] = useState(false);
  const moreRef = useRef(null);
  useEffect(() => {
    if (!moreOpen) return undefined;
    const close = (event) => {
      if (!moreRef.current?.contains(event.target) || event.key === 'Escape') setMoreOpen(false);
    };
    document.addEventListener('pointerdown', close);
    document.addEventListener('keydown', close);
    return () => { document.removeEventListener('pointerdown', close); document.removeEventListener('keydown', close); };
  }, [moreOpen]);
  const linkClass = ({isActive}) => `my-1 flex min-w-0 flex-col items-center justify-center gap-1 rounded-xl px-1 text-xs font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-inset ${isActive ? 'bg-blue-50 text-blue-700' : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900'}`;
  return <nav aria-label="Dashboard mobile navigation" className="fixed inset-x-0 bottom-0 z-40 border-t border-slate-200 bg-white pb-[env(safe-area-inset-bottom)] shadow-sm md:hidden">
    <div className="grid h-16 grid-cols-4 gap-1 px-2">
      {dashboardLinks.map(({to,label,icon,end}) => <NavLink key={to} to={to} end={end}
        className={linkClass}>
        {React.createElement(icon, { 'aria-hidden': true, className: 'h-5 w-5' })}<span>{label}</span>
      </NavLink>)}
      <div ref={moreRef} className="relative">
        {moreOpen && <div id="dashboard-more-menu" role="menu" aria-label="More dashboard options" className="absolute bottom-[calc(100%+0.5rem)] right-0 min-w-48 rounded-2xl border border-slate-200 bg-white p-2 shadow-xl">
          <NavLink role="menuitem" to="/dashboard" onClick={() => setMoreOpen(false)} className="flex min-h-11 items-center gap-3 rounded-xl px-3 text-sm font-semibold text-slate-700 hover:bg-slate-50"><DollarSign className="h-5 w-5 text-primary" />Earnings</NavLink>
          <NavLink role="menuitem" to="/dashboard/settings" onClick={() => setMoreOpen(false)} className="flex min-h-11 items-center gap-3 rounded-xl px-3 text-sm font-semibold text-slate-700 hover:bg-slate-50"><Settings className="h-5 w-5 text-primary" />Profile settings</NavLink>
          <button role="menuitem" type="button" onClick={() => { setMoreOpen(false); onLogout(); }} className="flex min-h-11 w-full items-center gap-3 rounded-xl px-3 text-left text-sm font-semibold text-slate-700 hover:bg-slate-50"><LogOut className="h-5 w-5 text-primary" />Log out</button>
        </div>}
        <button type="button" aria-haspopup="menu" aria-expanded={moreOpen} aria-controls="dashboard-more-menu" onClick={() => setMoreOpen(value => !value)} className={linkClass({isActive: moreOpen})}>
          <ChevronUp aria-hidden="true" className={`h-5 w-5 transition-transform ${moreOpen ? 'rotate-180' : ''}`} /><span>More</span>
        </button>
      </div>
    </div>
  </nav>;
}
