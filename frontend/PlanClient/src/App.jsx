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
import ProfileSettings from './pages/ProfileSettings';
import ErrorPage from './components/ErrorPage';
import ReceiptPage from './pages/ReceiptPage';

export default function App() {
  return (
    <Router>
      <div className="min-h-screen font-sans antialiased text-slate-900 bg-slate-50">
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/about" element={<AboutPage />} />
          <Route path="/plans/:category" element={<BrowsePage />} />
          <Route path="/plans" element={<BrowsePage />} />
          <Route path="/plan/:id" element={<PlanDetailPage />} />
          <Route path="/checkout/new/:planId" element={<CheckoutPage />} />
          <Route path="/checkout/:reference" element={<CheckoutPage />} />
          <Route path="/checkout/:reference/receipt" element={<ReceiptPage />} />
          <Route path="/signUp" element={<Register />} />
          <Route path="/dashboard" element={<SellerDashboard />}>
            <Route index element={<DashboardOverview />} />
            <Route path="settings" element={<ProfileSettings />} />
          </Route>
          <Route path="*" element={<ErrorPage />} />
        </Routes>
      </div>
    </Router>
  );
}

