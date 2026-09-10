import React from 'react';
import { Link } from 'react-router-dom';
import { Home } from 'lucide-react';

export default function Footer() {

  return (
    <footer className="bg-blue-800 text-slate-200 py-16 px-6 mt-auto font-sans">
      {/* <div className=" mx-auto flex flex-col md:flex-row justify-between items-center gap-6"> */}
      <div className='grid grid-cols-1 lg:grid-cols-12 gap-12'>
        <div className="grid lg:col-span-4 items-left gap-4">
          <Link to="/" aria-label="PlanSoko home" className="flex items-center gap-4 rounded-lg text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white">
            <Home className=" w-8 h-8 text-white/60 " />
            <span className="text-2xl font-extrabold tracking-wider">PlanSoko</span>
          </Link>
          <p className="text-slate-200 max-w-md">
            At PlanSoko, we deliver quality house designs for your project.
          </p>
        </div>

        <div className=" grid lg:col-span-4 flex-col items-left">
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
              <a href="/plans" className="hover:text-white transition-colors">
                House Designs
              </a>
            </li>
            <li>
              <a href="/#common-questions" className="hover:text-white transition-colors">
                FAQs
              </a>
            </li>
          </ul>
        </div>

        <p className="text-sm text-slate-400 grid lg:col-span-4 items-center ">&copy; {new Date().getFullYear()} PlanSoko. All rights reserved.</p>
      </div>
    </footer>
  );
}
