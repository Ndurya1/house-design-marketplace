import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Home } from 'lucide-react';

export default function Footer() {
  const navigate = useNavigate();

  return (
    <footer className="bg-blue-800 text-slate-200 py-16 px-6 mt-auto font-sans">
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-6">
        <div className="flex flex-col items-left gap-4">
          <div className="flex items-center gap-4 text-white cursor-pointer" onClick={() => navigate('/')}>
            <Home className="text-primary w-6 h-6 text-slate-800" />
            <span className="text-xl font-bold tracking-tight">PlanSoko</span>
          </div>
          <p className="text-slate-200 max-w-md">
            At PlanSoko, we deliver quality house designs for your project.
          </p>
        </div>

        <div className="flex flex-col items-left">
          <h2 className="text-xl font-bold text-white">Quick Links</h2>
          <ul className="flex flex-col gap-2 mt-4 text-slate-300">
            <li>
              <a href="/" className="hover:text-white transition-colors">
                Home
              </a>
            </li>
            <li>
              <a href="/about" className="hover:text-white transition-colors">
                About
              </a>
            </li>
            <li>
              <a href="/plans/Bungalows" className="hover:text-white transition-colors">
                House Designs
              </a>
            </li>
            <li>
              <a href="#" className="hover:text-white transition-colors">
                Contact
              </a>
            </li>
          </ul>
        </div>

        <p className="text-sm text-slate-400">&copy; {new Date().getFullYear()} PlanSoko. All rights reserved.</p>
      </div>
    </footer>
  );
}
