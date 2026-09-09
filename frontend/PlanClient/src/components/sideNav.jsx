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
 
} from 'lucide-react';

export default function SideNav(){
    const navigate = useNavigate();
    const [user, setUser] =useState(() => {
      try { return JSON.parse(localStorage.getItem('user')); } catch { return null; }
    });
    // const [activePage, setActivePage] = useState(true);

    const handleLogout = () => {
    localStorage.removeItem("accessToken");
    localStorage.removeItem("refreshToken");
    localStorage.removeItem("user");
    setUser(null);
    navigate("/");
  };

    return(
        <aside className=" hidden md:w-52 md:flex flex-col bg-white text-blue-800  min-h-screen p-2 border border-gray-200 rounded-lg items-left justidy-left shadow-sm "> 

          <div className="flex  gap-2 cursor-pointer p-2 pb-12" onClick={() => navigate("/")}>
          <Home className="text-primary w-8 h-8 text--blue-800" />
          <span className="text-xl font-bold  tracking-tight">PlanSoko</span>
        </div>

        <hr className="border-gray-400 pb-4" />

        <div className="flex flex-col gap-2 pb-12">
            <div className="flex flex-row items-center gap-2 p-2 text-black active:text-white hover:bg-gray-400 cursor-pointer font-semibold  active:bg-primary rounded-lg " onClick={() => navigate("/dashboard")}>
            <Home className="text-blue-800"/> Overview 
            </div>

            <div className="flex flex-row items-center gap-2 p-2 text-black hover:bg-gray-400 cursor-pointer font-semibold  active:bg-primary rounded-lg active:text-white " onClick={() => navigate("/dashboard")}>
            <FileText className="text-blue-800"/> My Designs
            </div>

            <div className="flex flex-row items-center gap-2 p-2 text-black hover:bg-gray-400 cursor-pointer font-semibold  active:bg-primary active:text-white rounded-lg " onClick={() => navigate("/dashboard")}>
            <FileText className="text-blue-800"/> Orders
            </div>

            <div className="flex flex-row items-center gap-2 p-2 text-black hover:bg-gray-400 cursor-pointer font-semibold  active:bg-primary active:text-white rounded-lg " onClick={() => navigate("/dashboard")}>
            <DollarSign className="text-blue-800"/> Earnings
            </div>


        </div>  
        

        <div className="flex flex-col gap-2 pb-12">
             <div className="flex flex-row items-center gap-2 p-2 text-black active:text-white hover:bg-gray-400 cursor-pointer font-semibold  active:bg-primary rounded-lg " onClick={() => navigate("/dashboard/settings")}>
            <Settings className="text-blue-800"/> Settings 
            </div>

             <div className="flex flex-row items-center gap-2 p-2 text-black  active:text-white hover:bg-gray-400 cursor-pointer font-semibold  active:bg-primary rounded-lg " onClick={handleLogout}>
            <LogOut className="text-blue-800"/> Log Out
            </div>
        </div>
        
         <hr className="border-gray-400  bottom-2  left-1" />
        <div className="  flex items-center gap-2 text-black  bg-white p-2 rounded-xl border border-white/10 fixed bottom-2 left-1   ">

        

             <User className="w-10 h-10 text-blue-800 rounded-full bg-gray-200 p-1" />
                        <span className="text-md font-semibold max-w-[100px] truncate">{user?.name || "Seller"} <br/> <p className="text-xs text-blue-800/70">Designer</p></span>

                       
                      </div>

        </aside>
    )
}

