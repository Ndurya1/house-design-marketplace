import { LayoutDashboard, FileText, Receipt, Settings, TrendingUp } from 'lucide-react';

export const dashboardLinks = [
  { to: '/dashboard', label: 'Overview', icon: LayoutDashboard, end: true },
  { to: '/dashboard/designs', label: 'My Designs', icon: FileText },
  { to: '/dashboard/orders', label: 'Sales', icon: Receipt, mobilePrimary: false },
  { to: '/dashboard/revenue', label: 'Revenue', icon: TrendingUp, mobilePrimary: false },
  { to: '/dashboard/settings', label: 'Settings', icon: Settings },
];

export const mobilePrimaryDashboardLinks = dashboardLinks.filter(link => link.mobilePrimary !== false);
export const mobileMoreDashboardLinks = dashboardLinks.filter(link => link.mobilePrimary === false);
