import React from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Target,
  Compass,
  Shield,
  Gem,
  Scale,
  TrendingUp,
  UserCheck,
  Smile,
  DollarSign,
  Check,
  AlertTriangle,
  CheckCircle,
  MessageSquare,
  Eye,
  BookOpen,
  Briefcase,
  ArrowRight,
  Sparkles
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { publicPrimaryAction, publicSecondaryAction, publicCard } from '@/lib/publicStyles';

export default function AboutPage() {
  const navigate = useNavigate();

  const buyerPoints = [
    "You know the price before you start",
    "You see the full floor plan before you pay",
    "You download in minutes, not weeks",
    "You're not locked into a single designer's style or availability",
    "Your payment is protected until your download is confirmed"
  ];

  const designerPoints = [
    "One upload, unlimited downloads",
    "You set your own prices",
    "Buyers come to you — no pitching, no cold calls",
    "Your profile builds your professional reputation over time",
    "Payments are processed securely and transferred to you directly",
    "Your portfolio is always live, always searchable"
  ];

  const values = [
    {
      number: "01",
      title: "Honesty in every transaction",
      description: "What you see on PlanSoko is what you get. Accurate descriptions, real floor plans, verified designers. We don't allow vague listings or inflated credentials.",
      icon: Shield
    },
    {
      number: "02",
      title: "Quality over volume",
      description: "We'd rather have 500 excellent plans than 5,000 mediocre ones. Every design on PlanSoko meets a minimum standard before it's listed.",
      icon: Gem
    },
    {
      number: "03",
      title: "Respect for professional work",
      description: "Architecture is a skilled discipline. We price and present designs accordingly — not as cheap commodities, but as professional intellectual work.",
      icon: Briefcase
    },
    {
      number: "04",
      title: "Accessibility without compromise",
      description: "Lower cost shouldn't mean lower quality. We work to make verified, professional plans available at a range of price points, so more people can build well.",
      icon: BookOpen
    },
    {
      number: "05",
      title: "Accountability to both sides",
      description: "Buyers and sellers both depend on PlanSoko to be fair. We take disputes seriously, protect payments, and stand behind every transaction on the platform.",
      icon: Scale
    }
  ];

  return (
    <div className="flex flex-col min-h-screen bg-slate-50 font-sans antialiased text-slate-800 animate-in fade-in duration-700">
      <Header />

      
      <section className="relative pt-32 pb-24 px-6 overflow-hidden bg-slate-900 border-b border-slate-800">
      
        {/* <div className="absolute inset-0 z-0 opacity-10 bg-[linear-gradient(to_right,#808080_1px,transparent_1px),linear-gradient(to_bottom,#808080_1px,transparent_1px)] bg-[size:24px_24px]"></div> */}   
        
        {/* Glow Effects */}
        {/* <div className="absolute -top-40 -left-40 w-96 h-96 bg-blue-500 rounded-full filter blur-[120px] opacity-20 pointer-events-none"></div>
        <div className="absolute -bottom-40 -right-40 w-96 h-96 bg-blue-600 rounded-full filter blur-[120px] opacity-20 pointer-events-none"></div> */}

        <div className="relative z-10 max-w-4xl mx-auto text-center">
          <span className="inline-block px-6 py-2 rounded-full border border-white/50  font-bold font-sans uppercase tracking-wider text-white mb-6" >
           Our Story
          </span>
          <h1 className="font-sans text-4xl md:text-5xl lg:text-6xl font-extrabold text-white tracking-tight leading-tight mb-12">
            PlanSoko started with a <span className="text-blue-500">simple observation.</span>
          </h1>
          <div className="space-y-6 text-base md:text-lg text-slate-300 font-normal leading-relaxed max-w-3xl mx-auto text-left ">
            <p>
              Across East Africa, thousands of architects and building designers produce excellent work - plans that sit on hard drives or circulate through WhatsApp groups, never reaching the people who need them most.
            </p>
            <p>
              At the same time, homeowners spend months searching for a trustworthy designer, comparing prices through word of mouth, and waiting on custom drawings that may or may not meet their expectations.
            </p>
            <p className="font-normal text-white">
              PlanSoko was built to connect these two groups directly. A marketplace where professionals sell their work, and buyers find what they need - without friction on either side.
            </p>
          </div>
        </div>
      </section>

     
      <section className="py-16 md:py-24 px-6 max-w-7xl mx-auto w-full">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 md:gap-8 items-stretch">
          
          <div className="bg-white border border-slate-200/80 rounded-2xl p-6 md:p-10 shadow-sm flex flex-col justify-between hover:border-slate-300 transition-all duration-300">
            <div>
              <div className="w-12 h-12 rounded-xl bg-primary/20 text-primary flex items-center justify-center mb-6">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <h2 className="font-sans text-3xl font-bold text-slate-900 tracking-wide mb-6">
                Buying a house plan shouldn't be this hard.
              </h2>
              <div className="space-y-4 text-slate-600 leading-relaxed text-sm md:text-base">
                <p>
                  Right now, finding an architectural plan in East Africa looks like this: ask a relative for a referral, get a quote that changes once you've committed, wait weeks for drawings, discover the plan doesn't match your plot or local bylaws, and start again.
                </p>
                <p>
                  For designers, it's not much better. Revenue depends entirely on referrals. There's no way to reach buyers outside your personal network. Social media helps, but a Facebook post isn't a catalogue.
                </p>
              </div>
            </div>
            <div className="mt-8 pt-6 border-t border-slate-100 grid grid-cols-12 items-center gap-3">
              <span className="font-sans  text-primary bg-primary/20 px-3 py-1 rounded-full text-xs col-span-5">
                The Friction Point:
              </span>
              <p className="font-semibold text-slate-900 text-sm col-span-7 ">The problem isn't talent. It's infrastructure.</p>
            </div>
          </div>

          
          <div className="bg-blue-600 text-white rounded-2xl p-6 md:p-10 shadow-sm flex flex-col justify-between hover:bg-blue-700 transition-all duration-300 relative overflow-hidden group">
            {/* Subtle background glow */}
            <div className="absolute top-0 right-0 w-64 h-64 bg-blue-400 rounded-full filter blur-[100px] opacity-25 group-hover:scale-110 transition-transform duration-500"></div>

            <div className="relative z-10">
              <div className="w-12 h-12 rounded-xl bg-white/10 text-white flex items-center justify-center mb-6 border border-white/20">
                <CheckCircle className="w-6 h-6" />
              </div>
              <h2 className="font-sans text-3xl font-bold tracking-wide mb-6">
                A proper marketplace. For architectural plans.
              </h2>
              <div className="space-y-4 text-blue-100 leading-relaxed text-sm md:text-base">
                <p>
                  PlanSoko gives buyers a single place to browse, compare, and purchase verified architectural plans — with transparent pricing, floor plans included, and instant downloads.
                </p>
                <p>
                  For designers, it's a professional storefront. Upload your plans, set your price, and reach buyers you'd never find through referrals alone. You earn every time someone purchases your work.
                </p>
              </div>
            </div>
            <div className="relative z-10 mt-8 pt-6 border-t border-white/20 flex flex-wrap items-center gap-3">
              <span className="font-sans font-semibold text-white bg-white/15 px-3 py-1 rounded-full text-xs">
                The Solution
              </span>
              <p className="font-semibold text-white text-sm">No middlemen. No ambiguity. Just plans, and the professionals.</p>
            </div>
          </div>
        </div>
      </section>

      
      <section className="py-16 md:py-24 bg-slate-100 border-y border-slate-200/60 px-6">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
           
            <Card className={`${publicCard} overflow-hidden relative group`}>
              <div className="absolute top-0 left-0 w-2 h-full bg-blue-600"></div>
              <CardContent className="p-6 md:p-8 flex flex-col sm:flex-row md:flex-col lg:flex-row gap-4 items-start">
                <div className="flex-shrink-0 w-12 h-12 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                  <Target className="w-6 h-6" />
                </div>
                <div>
                  <span className="text-xs font-semibold text-blue-600 bg-blue-50 px-2.5 py-0.5 rounded-full uppercase tracking-wider mb-2 inline-block">
                    Our Mission
                  </span>
                  <h3 className="font-sans text-2xl font-semibold text-slate-900 mb-4">
                    Architectural accessibility
                  </h3>
                  <p className="font-sans text-slate-600 text-sm md:text-base leading-relaxed">
                    To make quality architectural plans accessible to anyone building in East Africa — and to give the designers who create them a reliable way to earn from their work.
                  </p>
                </div>
              </CardContent>
            </Card>

            
            <Card className={`${publicCard} overflow-hidden relative group`}>
              <div className="absolute top-0 left-0 w-2 h-full bg-indigo-600"></div>
              <CardContent className="p-6 md:p-8 flex flex-col sm:flex-row md:flex-col lg:flex-row gap-4 items-start">
                <div className="flex-shrink-0 w-12 h-12 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                  <Compass className="w-6 h-6" />
                </div>
                <div>
                  <span className="text-xs font-semibold text-indigo-600 bg-indigo-50 px-2.5 py-0.5 rounded-full uppercase tracking-wider mb-2 inline-block">
                    Our Vision
                  </span>
                  <h3 className="font-sans text-2xl font-semibold text-slate-900 mb-4">
                    Empowering the ecosystem
                  </h3>
                  <p className="font-sans text-slate-600 text-sm md:text-base leading-relaxed">
                    A future where a homeowner in Kisumu can find a plan designed for their plot size and budget in an afternoon, and an architect in Nairobi earns passive income from designs they drew once.
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      
      <section className="py-16 md:py-24 px-6 max-w-7xl mx-auto w-full">
        <div className="text-center max-w-2xl mx-auto mb-16">
          <span className="inline-block px-6 py-2 rounded-full border border-blue-600 text-xs font-bold font-sans uppercase tracking-wider text-slate-800 mb-6" >
            What We Stand For
          </span>
          <h2 className="font-sans  text-3xl md:text-4xl font-bold text-slate-900 tracking-tight mt-4 mb-3">
            Our Core Values
          </h2>
          <p className="text-slate-600 text-sm md:text-base">
            These values shape how we interact with both our buyers and the designers who place their trust in our marketplace.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {values.map((val) => {
            const IconComponent = val.icon;
            return (
              <Card 
                key={val.number} 
                className={`${publicCard} relative overflow-hidden p-6 md:p-8 group flex flex-col justify-between`}
              >
                <div>
                  {/* Big background number watermark */}
                  <span className="text-slate-100 text-7xl font-extrabold select-none absolute right-4 top-2 group-hover:scale-105 transition-transform duration-300">
                    {val.number}
                  </span>
                  
                  <div className="flex-shrink-0 w-12 h-12 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300">
                    <IconComponent className="w-6 h-6" />
                  </div>
                  
                  <h4 className="font-sans font-semibold text-slate-900 text-lg md:text-xl mb-3 relative z-10">
                    {val.title}
                  </h4>
                  
                  <p className="font-sans text-slate-600 text-xs md:text-sm leading-relaxed relative z-10">
                    {val.description}
                  </p>
                </div>
              </Card>
            );
          })}
        </div>
      </section>

     
      <section className="py-16 md:py-24 bg-slate-900 text-white px-6 relative overflow-hidden border-t border-slate-800">
     

        <div className="relative z-10 max-w-7xl mx-auto">
          <div className="text-center max-w-2xl mx-auto mb-20">
            <span className="inline-block px-6 py-2 rounded-full border border-blue-500/60 text-xs font-bold font-sans uppercase tracking-wider text-white mb-6" >
              Why Choose PlanSoko
            </span>
            <h2 className="font-sans text-3xl md:text-4xl font-bold tracking-tight mt-4">
              Built with mutual trust in mind
            </h2>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-16">
            {/* Buyer Column */}
            <div className="bg-slate-800/40 border border-slate-700/50 rounded-2xl p-8 md:p-10 backdrop-blur-sm">
              <div className="flex items-center gap-3 mb-6 pb-4 border-b border-slate-700/50">
                <div className="w-10 h-10 rounded-lg bg-blue-500/20 text-blue-400 flex items-center justify-center">
                  <Smile className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-sans text-xl font-semibold">Why Buyers Love Us</h3>
                  <p className="text-xs text-slate-400 mt-0.5">Streamlined paths to the perfect project design</p>
                </div>
              </div>
              <p className="text-slate-300 text-sm leading-relaxed mb-8">
                You don't have to take our word for it. Here's what changes when you find a plan on PlanSoko instead of starting from scratch.
              </p>
              <ul className="space-y-4">
                {buyerPoints.map((pt, i) => (
                  <li key={i} className="flex gap-3 items-start">
                    <span className="w-5 h-5 rounded-full bg-blue-500/20 text-blue-400 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <Check className="w-3.5 h-3.5" />
                    </span>
                    <span className="text-sm text-slate-200 leading-relaxed">{pt}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Designer Column */}
            <div className="bg-slate-800/40 border border-slate-700/50 rounded-2xl p-8 md:p-10 backdrop-blur-sm">
              <div className="flex items-center gap-3 mb-6 pb-4 border-b border-slate-700/50">
                <div className="w-10 h-10 rounded-lg bg-indigo-500/20 text-indigo-400 flex items-center justify-center">
                  <TrendingUp className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-sans text-xl font-semibold">Why Designers Love Us</h3>
                  <p className="text-xs text-slate-400 mt-0.5">Unlocking new digital revenue from your portfolio</p>
                </div>
              </div>
              <p className="text-slate-300 text-sm leading-relaxed mb-8">
                PlanSoko isn't a job board or a freelance platform. It's a place to sell work you've already done, repeatedly, to buyers you'd never reach on your own.
              </p>
              <ul className="space-y-4">
                {designerPoints.map((pt, i) => (
                  <li key={i} className="flex gap-3 items-start">
                    <span className="w-5 h-5 rounded-full bg-indigo-500/20 text-indigo-400 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <Check className="w-3.5 h-3.5" />
                    </span>
                    <span className="text-sm text-slate-200 leading-relaxed">{pt}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </section>

    
      <section className="py-16 md:py-24 px-6 max-w-7xl mx-auto w-full">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
         
          <div className="bg-slate-900 text-white rounded-2xl p-6 md:p-10 shadow-sm flex flex-col justify-between transition-all duration-300 group">
            <div>
              <span className="text-xs font-semibold text-blue-400 bg-blue-500/10 px-2.5 py-1 rounded-full uppercase tracking-wider border border-blue-500/20 mb-6 inline-block">
                For Buyers
              </span>
              <h3 className="font-sans text-3xl font-semibold tracking-tight mb-4">
                Ready to find your plan?
              </h3>
              <p className="text-slate-300 text-sm md:text-base leading-relaxed mb-8">
                Browse hundreds of verified designs — filtered by type, size, and style. Download the moment you're ready.
              </p>
            </div>
            <div>
              <Button
                size="lg"
                onClick={() => navigate('/plans/Bungalows')}
                className={`${publicPrimaryAction} gap-2 group`}
              >
                Browse House Plans <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </Button>
            </div>
          </div>

        
          <div className="bg-gradient-to-br from-blue-700 to-indigo-800 text-white rounded-2xl p-6 md:p-10 shadow-sm flex flex-col justify-between transition-all duration-300 group">
            <div>
              <span className="text-xs font-semibold text-indigo-200 bg-white/10 px-2.5 py-1 rounded-full uppercase tracking-wider border border-white/10 mb-6 inline-block">
                For Designers
              </span>
              <h3 className="font-sans text-3xl font-semibold tracking-tight mb-4">
                Ready to list your work?
              </h3>
              <p className="text-blue-100 text-sm md:text-base leading-relaxed mb-8">
                Join a growing community of professional designers selling on PlanSoko. Setup takes minutes.
              </p>
            </div>
            <div>
              <Button
                size="lg"
                onClick={() => navigate('/signUp')}
                className={`${publicSecondaryAction} gap-2 group`}
              >
                Become a Seller <ArrowRight className="w-4 h-4 text-blue-800 group-hover:translate-x-1 transition-transform" />
              </Button>
            </div>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}
