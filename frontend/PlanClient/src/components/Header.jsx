import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Home, Menu, LogOut, LayoutDashboard, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getCategories } from "@/api";
import AuthModal from "./AuthModal";

const GROUP_LABELS = {
  residential: "Residential",
  commercial: "Commercial",
  other: "Other",
};

export default function Header() {
  const navigate = useNavigate();
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(() => {
    try { return JSON.parse(localStorage.getItem('user')); } catch { return null; }
  });
  const [isAuthOpen, setIsAuthOpen] = useState(false);

  useEffect(() => {
    getCategories()
      .then(setCategories)
      .catch(() => setCategories([]))
      .finally(() => setLoading(false));

  }, []);

  const handleAuthSuccess = () => {
    const storedUser = localStorage.getItem("user");
    if (storedUser) {
      setUser(JSON.parse(storedUser));
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("accessToken");
    localStorage.removeItem("refreshToken");
    localStorage.removeItem("user");
    setUser(null);
    navigate("/");
  };

  const handleCategoryChange = (event) => {
    const value = event.target.value;
    if (value) {
      navigate(`/plans/${encodeURIComponent(value)}`);
      event.target.value = "";
    }
  };

  return (
    <header className="absolute top-0 w-full z-50 ">
      <div className="max-w-7xl mx-auto flex items-center justify-between glassmorphism rounded-t-xl p-2 shadow-lg bg-blue-600 backdrop-blur-md">
        <div className="flex items-center gap-2 cursor-pointer" onClick={() => navigate("/")}>
          <Home className="text-primary w-8 h-8 text-white" />
          <span className="text-xl font-bold text-white tracking-tight">PlanSoko</span>
        </div>
        
        <nav className="hidden md:flex items-center gap-8 text-white font-medium text-sm">
          <a href="/" className="hover:text-white/80 transition-colors">Home</a>
          <a href="/about" className="hover:text-white/80 transition-colors">About</a>
          <button
            type="button"
            onClick={() => navigate('/plans')}
            className="hover:text-white/80 transition-colors"
          >
            House Designs
          </button>
          <a href="#" className="hover:text-white/80 transition-colors">Contact</a>
          <div>
            <select
              className="w-full bg-transparent border-0 outline-none text-white/90 text-sm h-10 cursor-pointer"
              defaultValue=""
              disabled={loading}
              onChange={handleCategoryChange}
            >
              <option value="" disabled hidden className="text-slate-800">
                {loading ? "Loading..." : "Categories"}
              </option>
              {Object.entries(
                categories.reduce((groups, category) => {
                  const group = category.group;
                  groups[group] = [...(groups[group] || []), category];
                  return groups;
                }, {})
              ).map(([group, items]) => (
                <optgroup key={group} label={GROUP_LABELS[group] || group} className="text-slate-800">
                  {items.map((category) => (
                    <option key={category.id} value={category.id} className="text-slate-800">
                      {category.name}
                    </option>
                  ))}
                </optgroup>
              ))}
            </select>
          </div>
        </nav>

        <div className="flex items-center gap-4">
          {user ? (
            <>
              {user.role === "seller" && (
                <Button
                  onClick={() => navigate("/dashboard")}
                  className="bg-white text-black hover:bg-transparent rounded-lg px-4 flex items-center gap-1.5 hover:border hover:border-white text-xs"
                >
                  <LayoutDashboard className="w-4 h-4" />
                  Dashboard
                </Button>
              )}
              <div className="hidden sm:flex items-center gap-2 text-white/90 px-3 py-1.5 rounded-lg border border-white">
                <User className="w-4 h-4" />
                <span className="text-xs font-semibold max-w-[100px] truncate">{user.name}</span>
              </div>
              <Button
                onClick={handleLogout}
                variant="ghost"
                className="text-white hover:text-white hover:bg-white/20 rounded-xl px-3"
              >
                <LogOut className="w-4 h-4" />
              </Button>
            </>
          ) : (
            <>
              <Button
                variant="ghost"
                onClick={() => setIsAuthOpen(true)}
                className="text-white hover:text-white hover:bg-white/20 hidden sm:flex"
              >
                Log in
              </Button>
              <Button
                onClick={() => setIsAuthOpen(true)}
                className="bg-white text-slate-900 hover:bg-slate-100 rounded-xl px-6"
              >
                Sign Up
              </Button>
            </>
          )}
          <Button variant="ghost" size="icon" className="md:hidden text-white">
            <Menu />
          </Button>
        </div>
      </div>

      <AuthModal
        isOpen={isAuthOpen}
        onClose={() => setIsAuthOpen(false)}
        onSuccess={handleAuthSuccess}
      />
    </header>
  );
}


