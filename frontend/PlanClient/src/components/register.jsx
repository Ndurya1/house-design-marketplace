
import { Button } from '@/components/ui/button';

export default function Register() {
    return(
        <section className='flex flex-col justify-center items-center gap-10  md:flex-row md:gap-10 md:max-w-5xl m-auto md:h-screen  '>

            <div className='flex flex-col items-center  bg-blue-600 p-4 gap-5 w-full md:w-[400px] m-auto md:justify-center  md:min-h-full border border-gray-300 md:shrink-0 pb-14 md:pb-0 rounded-bl-[100px] md:rounded-none md:items-center '>
                <h2 className='text-4xl text-white font-semibold tracking-wide text-center '>Adventure Starts <br/> Here!</h2>
                <p className='text-md text-slate-200 '>Create a seller account to get started!</p>

                  <Button size="lg" variant="outline" className="h-12 w-[140px] rounded-full  shadow-lg bg-outline hover:bg-primary/90 text-slate-200  transition-transform active:scale-95">
                              Login
                </Button> 
            </div>

            <form className="">
                <h2 className="text-3xl md:text-5xl font-bold text-slate-800 tracking-tight mb-6 drop-shadow-xl leading-tight">Create Account</h2>
                <input type="text" placeholder='Full Name' className='w-full p-4 rounded-md border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent' />

                <input type="email" placeholder='Email Address' className='w-full p-4 rounded-md border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent' />

                <input type="password" placeholder='Password' className='w-full p-4 rounded-md border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent' />

                <Button variant="default" size="lg" className='w-full mt-4'>Register</Button>

            </form>
        </section>
    )
}
