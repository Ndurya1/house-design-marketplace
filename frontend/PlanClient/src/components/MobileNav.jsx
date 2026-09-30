import React, { useEffect, useRef, useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { ChevronUp, LogOut, Settings } from 'lucide-react';
import { mobileMoreDashboardLinks, mobilePrimaryDashboardLinks } from '@/lib/dashboardNavigation';

export default function MobileNav({ onLogout }) {
  const location = useLocation();
  const [openLocation, setOpenLocation] = useState(null);
  const moreRef = useRef(null);
  const toggleRef = useRef(null);
  const moreOpen = openLocation === location.key;

  // Clear stale disclosure state so browser Back cannot reopen an old panel.
  if (openLocation !== null && openLocation !== location.key) {
    setOpenLocation(null);
  }

  useEffect(() => {
    if (!moreOpen) return undefined;
    const closeOutside = (event) => {
      if (!moreRef.current?.contains(event.target)) setOpenLocation(null);
    };
    const closeEscape = (event) => {
      if (event.key === 'Escape') {
        setOpenLocation(null);
        toggleRef.current?.focus();
      }
    };
    const desktop = window.matchMedia('(min-width: 768px)');
    const closeDesktop = (event) => {
      if (event.matches) setOpenLocation(null);
    };
    document.addEventListener('pointerdown', closeOutside);
    document.addEventListener('keydown', closeEscape);
    desktop.addEventListener('change', closeDesktop);
    return () => {
      document.removeEventListener('pointerdown', closeOutside);
      document.removeEventListener('keydown', closeEscape);
      desktop.removeEventListener('change', closeDesktop);
    };
  }, [moreOpen]);

  const closeMore = () => setOpenLocation(null);
  const linkClass = ({ isActive }) => `my-1 flex min-w-0 flex-col items-center justify-center gap-1 rounded-xl px-1 text-xs font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-inset ${isActive ? 'bg-blue-50 text-blue-700' : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900'}`;
  const optionClass = 'flex min-h-11 w-full items-center gap-3 rounded-xl px-3 text-left text-sm font-semibold text-slate-700 hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-inset';

  return <nav aria-label="Dashboard mobile navigation" className="fixed inset-x-0 bottom-0 z-40 border-t border-slate-200 bg-white pb-[env(safe-area-inset-bottom)] shadow-sm md:hidden">
    <div className="grid h-16 grid-cols-4 gap-1 px-2">
      {mobilePrimaryDashboardLinks.map(({ to, label, icon, end }) => <NavLink key={to} to={to} end={end} onClick={closeMore} className={linkClass}>
        {React.createElement(icon, { 'aria-hidden': true, className: 'h-5 w-5' })}<span>{label}</span>
      </NavLink>)}
      <div ref={moreRef} className="relative" onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget)) closeMore();
      }}>
        <button ref={toggleRef} type="button" aria-expanded={moreOpen} aria-controls="dashboard-more-options" onClick={() => setOpenLocation(moreOpen ? null : location.key)} className={`${linkClass({ isActive: moreOpen })} min-h-11 w-full h-[calc(100%-0.5rem)]`}>
          <ChevronUp aria-hidden="true" className={`h-5 w-5 transition-transform motion-reduce:transition-none ${moreOpen ? 'rotate-180' : ''}`} /><span>More</span>
        </button>
        <div id="dashboard-more-options" hidden={!moreOpen} role="group" aria-label="More dashboard options" className="absolute bottom-[calc(100%+0.5rem)] right-0 min-w-48 rounded-2xl border border-slate-200 bg-white p-2 shadow-xl">
          {mobileMoreDashboardLinks.map(({ to, label, icon }) => <NavLink key={to} to={to} onClick={closeMore} className={optionClass}>{React.createElement(icon, { 'aria-hidden': true, className: 'h-5 w-5 text-primary' })}{label}</NavLink>)}
          <NavLink to="/dashboard/settings" onClick={closeMore} className={optionClass}><Settings aria-hidden="true" className="h-5 w-5 text-primary" />Profile settings</NavLink>
          <button type="button" onClick={() => { closeMore(); onLogout(); }} className={optionClass}><LogOut aria-hidden="true" className="h-5 w-5 text-primary" />Log out</button>
        </div>
      </div>
    </div>
  </nav>;
}
