import React, { useEffect, useRef, useState } from 'react';
import { Link, NavLink, useLocation, useNavigate } from 'react-router-dom';
import { Home, Menu, X, LogOut, LayoutDashboard } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { getCategories } from '@/api';
import AuthModal from './AuthModal';

const GROUP_LABELS = { residential: 'Residential', commercial: 'Commercial', other: 'Other' };
const focusStyle = 'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-blue-600';

export default function Header() {
  const navigate = useNavigate();
  const location = useLocation();
  const headerRef = useRef(null);
  const toggleRef = useRef(null);
  const [menuLocation, setMenuLocation] = useState(null);
  const menuOpen = menuLocation === location.key;
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(() => {
    try { return JSON.parse(localStorage.getItem('user')); } catch { return null; }
  });
  const [authMode, setAuthMode] = useState(null);

  useEffect(() => {
    let active = true;
    getCategories().then(data => { if (active) setCategories(data); })
      .catch(() => { if (active) setCategories([]); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  useEffect(() => {
    if (!menuOpen) return;
    const closeOutside = event => {
      if (!headerRef.current?.contains(event.target)) setMenuLocation(null);
    };
    const closeEscape = event => {
      if (event.key === 'Escape') {
        setMenuLocation(null);
        toggleRef.current?.focus();
      }
    };
    const desktop = window.matchMedia('(min-width: 1024px)');
    const closeDesktop = event => { if (event.matches) setMenuLocation(null); };
    document.addEventListener('pointerdown', closeOutside);
    document.addEventListener('keydown', closeEscape);
    desktop.addEventListener('change', closeDesktop);
    return () => {
      document.removeEventListener('pointerdown', closeOutside);
      document.removeEventListener('keydown', closeEscape);
      desktop.removeEventListener('change', closeDesktop);
    };
  }, [menuOpen]);

  const closeMenu = () => setMenuLocation(null);
  const openAuth = mode => { closeMenu(); setAuthMode(mode); };
  const handleLogout = () => {
    for (const key of ['accessToken', 'refreshToken', 'user']) localStorage.removeItem(key);
    setUser(null);
    closeMenu();
    navigate('/');
  };
  const linkClass = ({ isActive }) => `flex min-h-11 items-center rounded-lg px-3 text-sm font-medium transition-colors ${focusStyle} ${isActive ? 'bg-white/20 text-white' : 'text-white/90 hover:bg-white/10 hover:text-white'}`;
  const links = () => <>
    <NavLink to="/" end onClick={closeMenu} className={linkClass}>Home</NavLink>
    <NavLink to="/about" onClick={closeMenu} className={linkClass}>About</NavLink>
    <NavLink to="/plans" onClick={closeMenu} className={linkClass}>House Designs</NavLink>
    <a href="/#common-questions" onClick={closeMenu} className={`flex min-h-11 items-center rounded-lg px-3 text-sm font-medium text-white/90 hover:bg-white/10 ${focusStyle}`}>FAQs</a>
  </>;
  const categorySelect = id => <select
    id={id} aria-label="Browse house design categories"
    className={`min-h-11 w-full min-w-0 rounded-lg border border-white/30 bg-blue-600 px-3 text-sm text-white lg:w-36 ${focusStyle}`}
    value="" disabled={loading || categories.length === 0}
    onChange={event => { closeMenu(); navigate(`/plans/${encodeURIComponent(event.target.value)}`); }}
  >
    <option value="" disabled>{loading ? 'Loading categories…' : categories.length ? 'Categories' : 'No categories'}</option>
    {Object.entries(categories.reduce((groups, category) => {
      (groups[category.group] ??= []).push(category);
      return groups;
    }, {})).map(([group, items]) => <optgroup key={group} label={GROUP_LABELS[group] || group}>
      {items.map(category => <option key={category.id} value={category.id}>{category.name}</option>)}
    </optgroup>)}
  </select>;
  const accountActions = () => user ? <>
    {user.role === 'seller' && <Link to="/dashboard" onClick={closeMenu} className={`inline-flex min-h-11 items-center justify-center gap-2 rounded-full bg-white px-4 text-sm font-semibold text-slate-900 hover:bg-slate-100 ${focusStyle}`}><LayoutDashboard aria-hidden="true" className="h-4 w-4" />Dashboard</Link>}
    <Button variant="ghost" onClick={handleLogout} className="gap-2 text-white hover:bg-white/10 hover:text-white"><LogOut aria-hidden="true" className="h-4 w-4" />Log out</Button>
  </> : <>
    <Button variant="ghost" onClick={() => openAuth('login')} className="text-white hover:bg-white/10 hover:text-white">Log in</Button>
    <Button onClick={() => openAuth('register')} className="rounded-full bg-white px-5 text-slate-900 hover:bg-slate-100">Sign Up</Button>
  </>;

  return <header ref={headerRef} className="absolute inset-x-0 top-0 z-50 bg-blue-600 text-white shadow-sm">
    <div className="mx-auto flex min-h-16 max-w-7xl items-center justify-between gap-3 px-4 sm:px-6">
      <Link to="/" onClick={closeMenu} aria-label="PlanSoko home" className={`flex shrink-0 items-center gap-2 rounded-lg ${focusStyle}`}>
        <Home aria-hidden="true" className="h-7 w-7" /><span className="text-xl font-bold tracking-tight">PlanSoko</span>
      </Link>
      <nav aria-label="Main navigation" className="hidden items-center gap-1 lg:flex">{links()}{categorySelect('desktop-categories')}</nav>
      <div className="hidden items-center gap-2 lg:flex">{accountActions()}</div>
      <div className="flex shrink-0 items-center gap-2 lg:hidden">
        {!user && <Button onClick={() => openAuth('register')} className="rounded-full bg-white px-4 text-slate-900 hover:bg-slate-100">Sign Up</Button>}
        <Button ref={toggleRef} variant="ghost" size="icon" aria-label={menuOpen ? 'Close navigation menu' : 'Open navigation menu'} aria-expanded={menuOpen} aria-controls="mobile-navigation" onClick={() => setMenuLocation(menuOpen ? null : location.key)} className="text-white hover:bg-white/10 hover:text-white">
          {menuOpen ? <X aria-hidden="true" /> : <Menu aria-hidden="true" />}
        </Button>
      </div>
    </div>
    {menuOpen && <nav id="mobile-navigation" aria-label="Mobile navigation" className="max-h-[calc(100dvh-4rem)] overflow-y-auto border-t border-white/20 px-4 pb-5 pt-3 shadow-lg lg:hidden">
      <div className="grid gap-1">{links()}{categorySelect('mobile-categories')}</div>
      <div className="mt-4 border-t border-white/20 pt-4">
        {user && <p className="mb-3 break-words text-sm text-white/80">Signed in as <span className="font-semibold text-white">{user.name || user.email || 'a member'}</span></p>}
        <div className="flex flex-wrap gap-2">{accountActions()}</div>
      </div>
    </nav>}
    {authMode && <AuthModal key={authMode} isOpen initialMode={authMode} onClose={() => setAuthMode(null)} onSuccess={() => {
      try { setUser(JSON.parse(localStorage.getItem('user'))); } catch { setUser(null); }
    }} />}
  </header>;
}
