import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import HomePage from './pages/HomePage';
import BrowsePage from './pages/BrowsePage';
import PlanDetailPage from './pages/PlanDetailPage';
import Register from './components/register';
import SellerDashboard from './pages/SellerDashboard';
import AboutPage from './pages/AboutPage';
import CheckoutPage from './pages/CheckoutPage';
import DashboardOverview from './pages/DashboardOverview';
import DashboardDesigns from './pages/DashboardDesigns';
import DashboardDesignDetail from './pages/DashboardDesignDetail';
import ProfileSettings from './pages/ProfileSettings';
import ErrorPage from './components/ErrorPage';
import ReceiptPage from './pages/ReceiptPage';
import DashboardOrders from './pages/DashboardOrders';
import DashboardOrderDetail from './pages/DashboardOrderDetail';
import DashboardRevenue from './pages/DashboardRevenue';
import PasswordResetRequestPage from './pages/PasswordResetRequestPage';
import PasswordResetConfirmPage from './pages/PasswordResetConfirmPage';
import HelpPage from './pages/HelpPage';

export default function App() {
  return (
    <Router>
      <div className="min-h-screen font-sans antialiased text-slate-900 bg-slate-50">
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/about" element={<AboutPage />} />
          <Route path="/help" element={<HelpPage />} />
          <Route path="/plans/:category" element={<BrowsePage />} />
          <Route path="/plans" element={<BrowsePage />} />
          <Route path="/plan/:id" element={<PlanDetailPage />} />
          <Route path="/checkout/new/:planId" element={<CheckoutPage />} />
          <Route path="/checkout/:reference" element={<CheckoutPage />} />
          <Route path="/checkout/:reference/receipt" element={<ReceiptPage />} />
          <Route path="/signUp" element={<Register />} />
          <Route path="/forgot-password" element={<PasswordResetRequestPage />} />
          <Route path="/reset-password/:uid/:token" element={<PasswordResetConfirmPage />} />
          <Route path="/dashboard" element={<SellerDashboard />}>
            <Route index element={<DashboardOverview key="overview" />} />
            <Route path="designs" element={<DashboardDesigns />} />
            <Route path="designs/:id" element={<DashboardDesignDetail />} />
            <Route path="orders" element={<DashboardOrders />} />
            <Route path="orders/:reference" element={<DashboardOrderDetail />} />
            <Route path="revenue" element={<DashboardRevenue />} />
            <Route path="settings" element={<ProfileSettings />} />
          </Route>
          <Route path="*" element={<ErrorPage />} />
        </Routes>
      </div>
    </Router>
  );
}

