import React, { useState } from 'react';
import { X, Lock, Mail, User } from 'lucide-react';
import { Button } from './ui/button';
import { registerUser, loginUser } from '@/api';

export default function AuthModal({ isOpen, onClose, onSuccess, initialMode = 'login' }) {
  const [isLogin, setIsLogin] = useState(initialMode === 'login');
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  if (!isOpen) return null;

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      if (isLogin) {
        const data = await loginUser({
          email: formData.email,
          password: formData.password,
        });

        localStorage.setItem('accessToken', data.access);
        localStorage.setItem('refreshToken', data.refresh);
        localStorage.setItem(
          'user',
          JSON.stringify({
            id: data.id,
            name: data.name,
            email: data.email,
            role: data.role,
          })
        );

        if (onSuccess) onSuccess();
        onClose();
      } else {
        // Registration
        await registerUser({
          name: formData.name,
          email: formData.email,
          password: formData.password,
        });

        // Auto login after registration
        const data = await loginUser({
          email: formData.email,
          password: formData.password,
        });

        localStorage.setItem('accessToken', data.access);
        localStorage.setItem('refreshToken', data.refresh);
        localStorage.setItem(
          'user',
          JSON.stringify({
            id: data.id,
            name: data.name,
            email: data.email,
            role: data.role,
          })
        );

        if (onSuccess) onSuccess();
        onClose();
      }
    } catch (err) {
      console.error(err.response || err);


      
      setError(
        isLogin
          ? 'Invalid credentials. Please try again.'
          : 'Registration failed. Email might already be in use.'
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-300">
      <div className="relative w-full max-w-md overflow-hidden rounded-xl bg-white backdrop-blur-md  border border-white/20 p-8 flex flex-col gap-6 transform transition-all scale-100">
        
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-5 right-5 text-slate-300 hover:text-slate-600 transition-colors p-1 bg-black hover:bg-slate-200 rounded-full"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header */}
        <div className="text-center">
          <h2 className="text-3xl font-bold text-slate-800 tracking-tight mb-2">
            {isLogin ? 'Welcome Back' : 'Create Account'}
          </h2>
          <p className="text-sm text-slate-500">
            {isLogin
              ? 'Log in to manage your house blueprints'
              : 'Join PlanSoko and start posting designs'}
          </p>
        </div>

        {error && (
          <div className="p-3.5 bg-red-50 border border-red-200 text-red-600 rounded-xl text-sm font-medium">
            {error}
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="flex flex-col gap-4 ">
          {!isLogin && (
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-slate-600 uppercase tracking-wider pl-1">
                Full Name
              </label>
              <div className="relative">
                <User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-blue-800 " />
                <input
                  type="text"
                  name="name"
                  required
                  value={formData.name}
                  onChange={handleChange}
                  placeholder="John Doe"
                  className="w-full pl-11 pr-4 py-3 bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all text-xs"
                />
              </div>
            </div>
          )}

          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-slate-600 uppercase tracking-wider pl-1">
              Email Address
            </label>
            <div className="relative">
              <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-blue-800 " />
              <input
                type="email"
                name="email"
                required
                value={formData.email}
                onChange={handleChange}
                placeholder="you@example.com"
                className="w-full pl-11 pr-4 py-3 bg-white  border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-xs focus:border-transparent transition-all"
              />
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-slate-600 uppercase tracking-wider pl-1">
              Password
            </label>
            <div className="relative">
              <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-blue-800" />
              <input
                type="password"
                name="password"
                required
                value={formData.password}
                onChange={handleChange}
                placeholder="••••••••"
                className="w-full pl-11 pr-4 py-3 bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all "
              />
            </div>
          </div>

          <Button
            type="submit"
            disabled={loading}
            className="w-full py-6 rounded-lg bg-blue-800  hover:bg-transparent hover:text-blue-800 hover:border text-white font-medium  mt-10"
          >
            {loading ? 'Please wait...' : isLogin ? 'Sign In' : 'Create Account'}
          </Button>
        </form>

        {/* Switch Link */}
        <div className="text-center text-sm text-slate-500 mt-2">
          {isLogin ? "Don't have an account? " : "Already have an account? "}
          <button
            onClick={() => setIsLogin(!isLogin)}
            className="text-blue-600 font-semibold hover:underline"
          >
            {isLogin ? 'Sign Up' : 'Log In'}
          </button>
        </div>
      </div>
    </div>
  );
}

