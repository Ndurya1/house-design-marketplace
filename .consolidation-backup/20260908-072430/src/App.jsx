import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import HomePage from './pages/HomePage';
import BrowsePage from './pages/BrowsePage';
import PlanDetailPage from './pages/PlanDetailPage';
import Register from './components/register';
import SellerDashboard from './pages/SellerDashboard';
import AboutPage from './pages/AboutPage';
import CheckoutPage from './pages/CheckoutPage';

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
          <Route path="/signUp" element={<Register />} />
          <Route path="/dashboard" element={<SellerDashboard />} />
        </Routes>
      </div>
    </Router>
  );
}
