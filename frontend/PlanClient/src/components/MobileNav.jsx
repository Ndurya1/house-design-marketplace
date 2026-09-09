import React from "react";
import { useState} from "react";
import {useNavigate} from 'react-router-dom';
import {
 Home,
  FileText,
  Settings,
  LogOut,
  User,
  DollarSign,
  ArrowRight,
  ArrowLeft
 
} from 'lucide-react';

export default function MobileNav(){
    const navigate = useNavigate();
    const [user, setUser] =useState(() => {
      try { return JSON.parse(localStorage.getItem('user')); } catch { return null; }
    });
    const [isOpen, setIsOpen] = useState(false);

    const handleLogout = () => {
    localStorage.removeItem("accessToken");
    localStorage.removeItem("refreshToken");
    localStorage.removeItem("user");
    setUser(null);
    navigate("/");
  };

    return(
        <div className=" md:hidden  flex  text-blue-800   p-2 border border-gray-200  shadow-sm fixed  inset-x-0 bottom-0 m-auto w-full h-[70px] z-50 bg-white border-t"> 

        <div className="flex flex-row gap-2 fixed bottom-1  right-1 items-center justify-center mr-12 p-2 rounded ">
            <div className="flex flex-col items-center gap-1 p-1 text-black active:text-white hover:bg-gray-400 cursor-pointer font-semibold  active:bg-primary rounded-lg text-xs " onClick={() => navigate("/dashboard")}>
            <Home className="text-blue-800"/> Overview 
            </div>

            <div className="flex flex-col items-center gap-1 p-1 text-black hover:bg-gray-400 cursor-pointer font-semibold  active:bg-primary rounded-lg active:text-white text-xs " onClick={() => navigate("/dashboard")}>
            <FileText className="text-blue-800"/> My Designs
            </div>

            <div className="flex flex-col items-center gap-1 p-1 text-black hover:bg-gray-400 cursor-pointer font-semibold  active:bg-primary active:text-white rounded-lg text-xs" onClick={() => navigate("/dashboard")}>
            <FileText className="text-blue-800"/> Orders
            </div>
     </div>  
        

    <div className="fixed bottom-2 right-2 flex items-center gap-2">
      {/* Toggle Button */}
      <button
        onClick={() => setIsOpen((prev) => !prev)}
        className="p-2 text-black hover:bg-gray-200 rounded-full transition-colors focus:outline-none"
        aria-label="Toggle menu"
      >
        {isOpen ? <ArrowRight className="text-blue-800" /> : <ArrowRight className="text-blue-800" /> }
      </button>

      
      {isOpen && (
        <div className="absolute bottom-12 right-0 flex flex-col gap-2 p-2 bg-white rounded-xl shadow-lg border border-gray-100 animate-in fade-in slide-in-from-bottom-2">
          <div
            className="flex flex-col items-center gap-1 p-2 text-black hover:bg-gray-100 cursor-pointer font-semibold rounded-lg text-xs"
            onClick={() => navigate("/dashboard")}
          >
            <DollarSign className="text-blue-800" />
            <span>Earnings</span>
          </div>

          <div
            className="flex flex-col items-center gap-1 p-2 text-black hover:bg-gray-100 cursor-pointer font-semibold rounded-lg text-xs"
            onClick={() => navigate("/dashboard/settings")}
          >
            <Settings className="text-blue-800" />
            <span>Settings</span>
          </div>

          <div
            className="flex flex-col items-center gap-1 p-2 text-black hover:bg-gray-100 cursor-pointer font-semibold rounded-lg text-xs"
            onClick={handleLogout}
          >
            <LogOut className="text-blue-800" />
            <span>Log Out</span>
          </div>
        </div>
      )}
    </div>
        
        
        <div className="  flex items-center gap-1 text-black p-2 rounded-xl fixed bottom-2 left-1   ">
          <User className="w-10 h-10 text-blue-800 rounded-full bg-gray-200 p-1" />
                        <span className="text-md font-semibold  truncate">{user?.name || "Seller"} <br/> <p className="text-xs text-blue-800/70">Designer</p></span>
                        

        </div>

        </div>
    )
}

