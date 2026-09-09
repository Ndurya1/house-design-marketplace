import React from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Home,} from "lucide-react";

export default function ErrorPage(){
    const navigate = useNavigate();

    return(
        <>

        <div className="flex  gap-2 cursor-pointer p-2 fixed items-center " onClick={() => navigate("/")}>
          <Home className="text-primary w-8 h-8 text--blue-800" />
          <span className="text-xl font-bold  tracking-tight">PlanSoko</span>
        </div>

        <div className="flex flex-col items-center justify-center min-h-screen ">
            <p className="flex gap-4 text-8xl font-extrabold font-sans -tracking-wider text-primary ">404 </p>
            <p className=" font-semibold tracking-wide items-center justify-center text-center"> Oops! looks like you got lost. We couldn't find this page<br/> <span className="text-xs font-light text-black/70">Maybe you should go back to where you started</span></p>

           
              <button onClick={()=>navigate("/")} className="flex py-1 mt-8 px-10 items-center rounded-md bg-primary text-white text-2xl font-bold gap-4">  <ArrowLeft className="w-8 h-12 text-gray-300
              "/> Home</button>
           

        </div>
        </>
    )
}
