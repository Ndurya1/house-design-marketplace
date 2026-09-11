import { useEffect, useState } from 'react';
import { ArrowUpRight, ChevronDown } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { getCategories } from '@/api';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { Button } from '@/components/ui/button';
import { publicPrimaryAction, publicSecondaryAction } from '@/lib/publicStyles';

const catalogue = [
  { name: 'Modern Homes', image: '/images/hero.webp', copy: 'Open layouts and crisp contemporary lines.' },
  { name: 'Bungalows', image: '/images/suburban.webp', copy: 'Single-storey plans made for family life.' },
  { name: 'Maisonettes', image: '/images/architecture.webp', copy: 'More room on the same footprint.' },
  { name: 'Villas', image: '/images/villa.webp', copy: 'Generous spaces for larger plots.' },
];

const steps = [
  ['01', 'Find a direction', 'Browse by house type, footprint, or the way you want to live.'],
  ['02', 'Review the details', 'See the preview, dimensions, inclusions, and listed price before you decide.'],
  ['03', 'Download and prepare', 'After purchase, review the files with your architect or engineer and confirm what your site needs.'],
];

const faqs = [
  ['Can I browse before creating an account?', 'Yes. The catalogue is open to browse. An account is needed when you purchase or list a design.'],
  ['What comes with a plan?', 'Each listing explains its included files and the format you receive. Check the plan details before purchasing.'],
  ['Can designers sell their existing work?', 'Yes. Designers can create a storefront, upload their own plans, and set a price for each design.'],
];

export default function HomePage() {
  const navigate = useNavigate();
  const [categories, setCategories] = useState([]);
  const [openFaq, setOpenFaq] = useState(0);
  useEffect(() => {
    const controller = new AbortController();
    getCategories({ signal: controller.signal }).then(items => { if (!controller.signal.aborted) setCategories(items.filter(item => item.is_active)); }).catch(() => {});
    return () => controller.abort();
  }, []);
  const categoryId = name => categories.find(item => item.name.toLowerCase() === name.toLowerCase())?.id;
  const browseCategory = name => navigate(categoryId(name) ? `/plans/${categoryId(name)}` : '/plans');

  return <div className="min-h-screen bg-[#f7f8fa] font-sans text-slate-900">
    <Header />
    <main>
      <section className="relative isolate min-h-[680px] overflow-hidden bg-slate-950 text-white md:min-h-[760px]">
        <img src="/images/hero.webp" alt="Contemporary house design" className="absolute inset-0 -z-20 h-full w-full object-cover" />
        <div className="absolute inset-0 -z-10 bg-[linear-gradient(90deg,rgba(2,6,23,.94)_0%,rgba(2,6,23,.68)_48%,rgba(2,6,23,.22)_100%)]" />
        <div className="mx-auto flex min-h-[680px] max-w-7xl items-end px-5 pb-20 pt-32 sm:px-8 md:min-h-[760px] md:pb-28 lg:px-12">
          <div className="max-w-2xl"><h1 className="max-w-xl text-5xl font-extrabold leading-[.98] tracking-[-.04em] sm:text-6xl lg:text-8xl">Start with a plan worth building.</h1><p className="mt-7 max-w-lg text-base leading-7 text-slate-200 sm:text-lg">Browse house plans drawn for the way people build and live here. Compare the details, choose your direction, and move forward with confidence.</p><div className="mt-9 flex flex-col gap-3 sm:flex-row"><Button onClick={() => navigate('/plans')} className={publicPrimaryAction}>Browse house plans <ArrowUpRight className="ml-2 h-4 w-4" /></Button><Button onClick={() => navigate('/signUp')} className={`${publicSecondaryAction} bg-white/10 text-white backdrop-blur-sm hover:bg-white hover:text-slate-900`}>Sell your designs</Button></div></div>
        </div><div className="absolute bottom-7 right-6 hidden items-center gap-3 text-xs text-slate-300 md:flex"><span className="h-px w-12 bg-white/50" /> Scroll to explore</div>
      </section>
      <section className="border-b border-slate-200 bg-white px-5 py-10 sm:px-8 lg:px-12"><div className="mx-auto grid max-w-7xl gap-8 md:grid-cols-3">{[['01', 'Clear pricing', 'See the price before you start a conversation.'], ['02', 'Useful previews', 'Understand the spaces before you commit.'], ['03', 'Made for this region', 'Find designs shaped around local plots and living.']].map(([number,title,copy]) => <div key={number} className="flex gap-4 border-l border-slate-200 pl-5"><span className="font-mono text-xs text-blue-600">{number}</span><div><h2 className="text-base font-semibold">{title}</h2><p className="mt-1 max-w-xs text-sm leading-6 text-slate-600">{copy}</p></div></div>)}</div></section>
      <section className="px-5 py-20 sm:px-8 md:py-28 lg:px-12"><div className="mx-auto max-w-7xl"><div className="flex flex-col justify-between gap-6 md:flex-row md:items-end"><div><p className="text-xs font-semibold uppercase tracking-[.2em] text-blue-600">The catalogue</p><h2 className="mt-3 max-w-xl text-4xl font-bold tracking-tight sm:text-5xl">A place to begin looking.</h2></div><button type="button" onClick={() => navigate('/plans')} className="flex items-center gap-2 self-start text-sm font-semibold text-slate-700 underline decoration-slate-300 underline-offset-4 hover:text-blue-700 md:self-auto">See all house plans <ArrowUpRight className="h-4 w-4" /></button></div><div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-2">{catalogue.map((item) => <button type="button" key={item.name} onClick={() => browseCategory(item.name)} className={`group text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-4 `}><div className="relative h-72 overflow-hidden rounded-2xl bg-slate-200 lg:h-80"><img src={item.image} alt="" loading="lazy" decoding="async" className="h-full w-full object-cover transition duration-300 motion-safe:group-hover:scale-105 motion-reduce:transition-none" /><div className="absolute inset-0 bg-gradient-to-t from-slate-950/75 via-transparent to-transparent" /><div className="absolute bottom-0 left-0 p-6 text-white"><p className="text-xl font-semibold">{item.name}</p><p className="mt-1 text-sm text-slate-200">{item.copy}</p></div></div></button>)}</div></div></section>
      <section className="border-y border-slate-200 bg-white px-5 py-20 sm:px-8 md:py-28 lg:px-12"><div className="mx-auto grid max-w-7xl gap-14 lg:grid-cols-[.8fr_1.2fr] lg:gap-24"><div><p className="text-xs font-semibold uppercase tracking-[.2em] text-blue-600">Why PlanSoko</p><h2 className="mt-3 text-4xl font-bold tracking-tight sm:text-5xl">Less searching. More building.</h2><p className="mt-6 max-w-md text-base leading-7 text-slate-600">A good plan should make the next decision easier. PlanSoko brings the drawings, details, and people behind them into one considered place.</p></div><div className="divide-y divide-slate-200 border-y border-slate-200">{[['01','Plans with context','Know what is included before payment.'],['02','A direct path to the designer','Ask the right questions when the details matter.'],['03','A useful starting point','Take a selected plan into the next professional conversation.']].map(([number,title,copy]) => <div key={number} className="grid gap-4 py-6 sm:grid-cols-[48px_1fr] sm:gap-6"><span className="font-mono text-xs text-blue-600">{number}</span><div><h3 className="text-lg font-semibold">{title}</h3><p className="mt-2 max-w-lg text-sm leading-6 text-slate-600">{copy}</p></div></div>)}</div></div></section>
      <section className="bg-slate-950 px-5 py-20 text-white sm:px-8 md:py-28 lg:px-12"><div className="mx-auto grid max-w-7xl gap-12 lg:grid-cols-[.75fr_1.25fr] lg:gap-24"><div><p className="text-xs font-semibold uppercase tracking-[.2em] text-blue-300">How it works</p><h2 className="mt-3 text-4xl font-bold tracking-tight sm:text-5xl">A simpler route from idea to plan.</h2></div><div className="grid gap-8 md:grid-cols-3">{steps.map(([number,title,copy]) => <div key={number} className="border-t border-white/20 pt-5"><span className="font-mono text-xs text-blue-300">{number}</span><h3 className="mt-10 text-xl font-semibold">{title}</h3><p className="mt-3 text-sm leading-6 text-slate-300">{copy}</p></div>)}</div></div></section>
      <section className="px-5 py-20 sm:px-8 md:py-28 lg:px-12"><div className="mx-auto grid max-w-7xl items-end gap-12 lg:grid-cols-2"><div><p className="text-xs font-semibold uppercase tracking-[.2em] text-blue-600">For designers</p><h2 className="mt-3 max-w-lg text-4xl font-bold tracking-tight sm:text-5xl">Bring your house plans to more buyers.</h2><p className="mt-6 max-w-lg text-base leading-7 text-slate-600">Create a storefront for your existing house plans. Set your price, describe the work, and let the right buyer find it.</p><Button onClick={() => navigate('/signUp')} className={`${publicPrimaryAction} mt-8`}>Create your designer profile <ArrowUpRight className="ml-2 h-4 w-4" /></Button></div><div className="relative overflow-hidden rounded-2xl bg-blue-700 p-8 text-white sm:p-12"><p className="max-w-md text-2xl font-semibold leading-tight sm:text-3xl">Show the design. Explain the details. Set your price.</p><div className="mt-8 flex items-center gap-2 text-sm text-blue-100">Your plans, in your own storefront</div></div></div></section>
      <section id="common-questions" className="scroll-mt-6 border-t border-slate-200 bg-white px-5 py-20 sm:px-8 md:py-28 lg:px-12"><div className="mx-auto grid max-w-7xl gap-12 lg:grid-cols-[.7fr_1.3fr] lg:gap-24"><div><p className="text-xs font-semibold uppercase tracking-[.2em] text-blue-600">Questions</p><h2 className="mt-3 text-4xl font-bold tracking-tight sm:text-5xl">Before you start building.</h2></div><div className="divide-y divide-slate-200 border-y border-slate-200">{faqs.map(([question,answer],index) => <div key={question}><button type="button" onClick={() => setOpenFaq(openFaq === index ? null : index)} aria-expanded={openFaq === index} aria-controls={`home-faq-${index}`} className="flex min-h-16 w-full items-center justify-between gap-5 py-4 text-left text-base font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary">{question}<ChevronDown className={`h-5 w-5 shrink-0 text-slate-400 transition-transform motion-reduce:transition-none ${openFaq === index ? 'rotate-180' : ''}`} /></button>{openFaq === index && <p id={`home-faq-${index}`} className="max-w-2xl pb-5 pr-8 text-sm leading-6 text-slate-600">{answer}</p>}</div>)}</div></div></section>
    </main><Footer />
  </div>;
}
