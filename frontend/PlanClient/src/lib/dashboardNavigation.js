import { LayoutDashboard, FileText, Settings } from 'lucide-react';

export const dashboardLinks = [
  { to: '/dashboard', label: 'Overview', icon: LayoutDashboard, end: true },
  { to: '/dashboard/designs', label: 'My Designs', icon: FileText },
  { to: '/dashboard/settings', label: 'Settings', icon: Settings },
];
