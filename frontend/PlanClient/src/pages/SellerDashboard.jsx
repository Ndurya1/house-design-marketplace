import React from "react";
import { Navigate, Outlet } from "react-router-dom";
import SideNav from '@/components/sideNav';
import MobileNav from "@/components/MobileNav";

export default function SellerDashboard(){
    let user;
    try {
        user = JSON.parse(localStorage.getItem('user'));
    } catch {
        return <Navigate to="/" replace />;
    }
    if (!localStorage.getItem('accessToken') || user?.role !== 'seller') {
        return <Navigate to="/" replace />;
    }
    return(
        <div className=" min-h-screen flex   bg-slate-50 font-sans">    
         <SideNav/>

         <main className="flex-1 min-w-0 pb-20 md:pb-0">
            <Outlet/>

         </main>
         <MobileNav/>
        </div>
    )
}
