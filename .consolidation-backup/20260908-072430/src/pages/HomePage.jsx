import React, { useEffect, useState } from 'react';
import { getCategories } from '@/api';
import { useNavigate } from 'react-router-dom';
import {
  Home,
  ChevronRight,
  ShieldCheck,
  Download,
  GitCompare,
  BadgeDollarSign,
  MessageCircle,
  MapPin,
  Search,
  CreditCard,
  UserRound,
  Upload,
  Eye,
  CheckCircle2,
  Plus,
  X,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import Header from '@/components/Header';
import Footer from '@/components/Footer';

const trustSignals = [
  'Verified professional designers',
  'Secure checkout',
  'Instant digital download',
  'Floor plans included',
  'Direct designer contact',
];

const categories = [
  {
    title: 'Modern Homes',
    description:
      'Clean lines, open layouts, and contemporary finishes. Designed for urban and peri-urban plots.',
    image: '/images/hero.webp',
    slug: 'Modern Homes',
  },
  {
    title: 'Bungalows',
    description:
      'Single-storey living with flexible room configurations. Popular for families and retirement builds.',
    image: '/images/suburban.webp',
    slug: 'Bungalows',
  },
  {
    title: 'Maisonettes',
    description:
      'Two levels, one title deed. Efficient use of land without sacrificing space.',
    image: '/images/architecture.webp',
    slug: 'Maisonettes',
  },
  {
    title: 'Villas',
    description:
      'Expansive designs with premium features — for larger plots and higher-end builds.',
    image: '/images/villa.webp',
    slug: 'Villas',
  },
  {
    title: 'Apartments',
    description:
      'Multi-unit plans optimised for rental yield and residential development.',
    image: '/images/cabin.webp',
    slug: 'Apartments',
  },
  {
    title: 'Tiny Homes',
    description:
      'Smart, compact, and surprisingly liveable. Designed for smaller budgets and smaller footprints.',
    image: '/images/hero.webp',
    slug: 'Tiny Homes',
  },
];

const benefits = [
  {
    icon: ShieldCheck,
    title: 'Plans you can trust',
    description:
      'Every design is uploaded by a verified architect or licensed building professional. What you see is what was drawn by someone qualified to draw it.',
  },
  {
    icon: Download,
    title: 'No waiting, no back-and-forth',
    description:
      'Download your plan the moment payment clears. No scheduling calls, no revision cycles, no delays.',
  },
  {
    icon: GitCompare,
    title: 'Compare before you commit',
    description:
      'View floor plans, specifications, and dimensions side by side. Make an informed decision without pressure from a designer.',
  },
  {
    icon: BadgeDollarSign,
    title: 'Transparent pricing',
    description:
      'Every plan has a listed price. No hidden consultation fees, no quotes that change after the first meeting.',
  },
  {
    icon: MessageCircle,
    title: 'Contact the designer directly',
    description:
      'Have questions before you buy? Message the designer through PlanSoko. Your conversation stays on record.',
  },
  {
    icon: MapPin,
    title: 'Built for East Africa',
    description:
      'Plans are designed with local building regulations, plot sizes, and construction realities in mind — not imported templates.',
  },
];

const buyerSteps = [
  {
    icon: Search,
    title: 'Browse',
    description:
      'Search by house type, number of bedrooms, plot size, or style. Filter to match your exact requirements.',
  },
  {
    icon: GitCompare,
    title: 'Compare',
    description:
      'View floor plans, elevations, and full specifications. Shortlist what you like.',
  },
  {
    icon: CreditCard,
    title: 'Purchase securely',
    description:
      'Pay through our secure checkout. Your payment is protected until your download is confirmed.',
  },
  {
    icon: Download,
    title: 'Download and build',
    description:
      'Receive your plan files instantly. Share them with your engineer, quantity surveyor, or local authority — ready to use.',
  },
];

const frequentlyAsked=[
  {
    question:'Do i have to pay to browse house plans on planSoko?',
    answer:'No, planSoko is totally free for buyers. just browse the plans catalogue and choose your best',
  },
  {
    question:'Who sets the price for designers?',
    answer:'At planSoko, designers set their prices independently based on their own criteria. PlanSoko doesn,t influence any of that',
  },
  
  {
    
    question: 'How much does it cost to build a 3-bedroom bungalow in Kenya in 2025?',
    answer: "The cost of building a 3-bedroom bungalow in Kenya in 2025 ranges between KES 2.5 million and KES 5 million depending on your location, choice of finishes, and construction method. In Nairobi's satellite towns like Ruiru, Kitengela, or Athi River, a simple but decent finish typically costs around KES 30,000 to KES 45,000 per square metre. For a standard 100 sqm bungalow, that puts your build cost at KES 3 million to KES 4.5 million — before factoring in site preparation, county council approval fees, water connection, and perimeter walling. Key cost drivers include: cement (currently around KES 700–750 per 50kg bag), iron sheets or roofing tiles, and labour. Many first-time builders on a 50x100 plot underestimate foundation costs, especially in areas with black cotton soil, which requires deeper strip or raft foundations. Always get a Bill of Quantities (BQ) from a registered quantity surveyor before breaking ground. Working with an NCA-registered contractor also protects you from inflated material quotes and phantom labour charges that are common with informal fundis."
  },
  {
    
    question: 'Do I need approved blueprints to build a house in Kenya, and how do I get them?',
    answer: "Yes, approved architectural blueprints are a legal requirement before any construction begins in Kenya. Under the Physical and Land Use Planning Act 2019, you must submit architectural drawings to your county government's Department of Physical Planning for approval — without this, your structure is considered illegal and can be demolished. The process involves hiring a registered architect (listed with the Board of Registration of Architects and Quantity Surveyors, BORAQS) to prepare drawings that comply with your county's zoning regulations and setback requirements. In Nairobi, approval fees depend on the floor area and can range from KES 15,000 to KES 80,000 or more. Turnaround time officially ranges from 30 to 60 days, though in practice it often takes longer. For a standard residential house on a 50x100 plot, your drawings will include a site plan, floor plan, elevations, and a drainage layout. Counties like Kiambu, Machakos, and Mombasa have slightly different submission requirements, so confirm locally. Never build on unapproved plans — banks won't finance, title transfers become complicated, and you risk enforcement action. Many diaspora homeowners have lost time and money discovering this too late."
  },
  {
    
    question: "How do I build a house in Kenya from abroad without being cheated by contractors or fundis?",

    answer: "Building a house in Kenya while living abroad is one of the most stressful journeys a diaspora homeowner faces, but with the right systems it is absolutely manageable. The biggest risk is financial — inflated material costs, ghost workers, and slow progress when no one is watching. Here is what works: First, hire a registered project manager or clerk of works based locally who reports directly to you — not to the contractor. Second, always use a Bill of Quantities prepared by a BORAQS-registered quantity surveyor so you know the exact cost of materials before money leaves your account. Third, pay for materials directly to verified hardware suppliers rather than releasing lump sums to a fundi. Fourth, use milestone-based payment — never pay more than 30% upfront. Fifth, install a site camera (affordable 4G solar options are widely available in Kenya) so you can check progress daily via your phone from the UK, US, or Canada. Sixth, only engage NCA-registered contractors who carry professional indemnity. Join Facebook communities like 'Build Wisely Kenya' and diaspora construction forums — peer reviews of contractors are incredibly valuable. Building in Kenya from abroad is very doable; protecting yourself is a matter of process, not luck."
  },
  {
    
    question: "What is the best house design for a 50x100 plot in Kenya for a diaspora homeowner on a budget?",
    answer: "For diaspora homeowners returning to build on a 50x100 plot in Kenya, the most cost-effective and practical design is a 3-bedroom bungalow with a simple rectangular or L-shaped footprint. A rectangular plan minimizes wall length per square metre of floor area, reducing both materials and labour costs significantly compared to complex shapes. On a standard 50x100 plot, county regulations typically require a 3-metre front setback, 1.5–2 metre side setbacks, and a rear setback — leaving you a comfortable buildable area of roughly 100 to 130 square metres. A well-designed 3-bedroom bungalow fits comfortably in this space. Flat-roof designs are increasingly popular among Kenyan diaspora builders because they cost less to construct than pitched roofs and allow for future upward expansion (adding a second storey later). However, flat roofs require quality waterproofing — poor workmanship leads to leaks. Alternatively, a low-pitch mabati or tile roof is proven, durable, and widely understood by local fundis. If your budget allows KES 4 million to KES 6 million, a maisonette gives more space and better resale value. Always procure approved blueprints designed by a BORAQS architect before sending any money home — many diaspora builders skip this and face costly rework."
  },
  {
    
    question: "Can I build on black cotton soil in Kenya, and how much extra does it cost?",
    answer: "Yes, you can build on black cotton soil in Kenya, but it requires specialized foundation design and adds meaningful cost to your project. Black cotton soil — common in parts of Nairobi (South B, South C, Embakasi), Kisumu, Nakuru, and large swathes of Rift Valley — is highly expansive: it swells when wet and shrinks when dry, causing conventional strip foundations to crack and shift. On black cotton soil, structural engineers typically specify one of three solutions: raft (mat) foundations, which spread the load across the entire footprint; pile foundations for heavier structures; or soil replacement, where the black cotton is excavated to a stable depth and replaced with murram or compacted gravel. A raft foundation on a 3-bedroom house typically adds KES 150,000 to KES 400,000 over a conventional strip foundation. Before purchasing a plot, always commission a soil test (geotechnical investigation) — it costs KES 15,000 to KES 40,000 and can save you hundreds of thousands in remedial work. Red soil plots in areas like Kiambu, Thika, and Limuru are generally easier and cheaper to build on. Disclose soil conditions to your structural engineer before approving any foundation design — never allow a fundi to skip this step."
  },
  {
    
    question: "What checks should I do before buying a plot to build a house in Kenya?",
    answer: "Buying a plot in Kenya is a high-stakes decision, and due diligence is non-negotiable. Here is the checklist every serious land buyer must run through before signing anything. First, conduct an official land search at the relevant lands registry — verify the title deed, confirm the registered owner matches your seller, and check for any encumbrances, cautions, or caveats. This costs around KES 500 and takes a few days. Second, verify the land use zoning with your county government's physical planning office — confirm that residential construction is permitted on the plot and check the allowable plot ratio and density. Third, commission a topographic and soil survey, especially if the land is near a river, valley, or seasonal wetland — these are often sold cheaply but carry flood risk and black cotton soil. Fourth, confirm road access and infrastructure: is there an existing road, and is it gazetted? Plots accessible only via private land are legally risky. Fifth, for agricultural land being converted to residential use, confirm the land change of user has been processed with the county and National Land Commission. Sixth, engage a registered advocate (lawyer) to handle conveyancing — never transfer money without legal representation. Many buyers on Facebook groups have lost their savings to double-sold plots and fake title deeds."
  },
  {
    
    question: "How do I register with the NCA as a contractor in Kenya, and why does it matter?",
    answer: "Registering with the National Construction Authority (NCA) in Kenya is now a legal requirement for any contractor undertaking construction works valued above KES 5 million. Registration also increasingly matters for smaller residential projects as county governments, banks, and informed clients — especially diaspora homeowners — specifically request NCA-registered contractors. The registration process involves submitting your business registration documents, tax compliance certificate (KRA PIN), proof of professional staff qualifications (for higher NCA tiers), and a registration fee that varies by contractor category from around KES 5,000 to KES 50,000. There are eight NCA contractor categories (NCA 1 being highest), and your category determines the value of projects you are eligible to undertake. For small residential fundis and SME builders, NCA 7 or NCA 8 registration is the appropriate entry point. Beyond legal compliance, NCA registration opens real business value: you can tender for government and NGO projects, you gain access to the NCA Wajibika platform for project registration, and clients trust you significantly more. The NCA also runs short skills training courses that boost your technical credibility. Start your application at nca.go.ke — the process is largely online. Staying unregistered increasingly means losing competitive work to those who are."
  },
  {
    
    question: "What are the most common construction defects on Kenyan residential projects and how can fundis avoid them?",
    answer: "Construction defects are one of the biggest sources of client complaints and reputation damage for fundis and small contractors in Kenya. Understanding and preventing the most common ones separates professionals from jua kali practitioners. The top defects seen repeatedly across Kenyan residential builds include: (1) Roof leaks — almost always caused by poor flashing at wall-roof junctions, wrong overlap on iron sheets, or inadequate slope on flat roofs. Always use quality waterproofing membrane on flat roofs and maintain minimum 3-degree falls to drainage outlets. (2) Cracked walls — most often a result of poor concrete mix ratios (too much sand, too little cement), inadequate curing, or building on expansive soils like black cotton without a proper raft foundation. The correct concrete mix for most structural elements is 1:2:4 (cement, sand, aggregate). (3) Damp penetration — caused by omitting DPC (damp-proof course) at ground level or using poor-quality plaster on external walls. (4) Uneven floors — result of rushing screed application without proper levelling. (5) Window and door frame misalignment — a fitting and supervision problem. For every build, maintain a site quality checklist, ensure proper concrete curing for at least 7 days, and never allow clients to pressure you into rushing critical structural stages. Your reputation is your most valuable business asset."
  }
];


const sellerSteps = [
  {
    icon: UserRound,
    title: 'Create your profile',
    description:
      'Set up your professional profile. Add your credentials, portfolio, and a short bio.',
  },
  {
    icon: Upload,
    title: 'Upload your plans',
    description:
      'List your designs with floor plans, elevations, and a clear description. Set your own price.',
  },
  {
    icon: Eye,
    title: 'Get discovered',
    description:
      'Your plans are visible to thousands of buyers browsing PlanSoko every week.',
  },
  {
    icon: BadgeDollarSign,
    title: 'Earn repeatedly',
    description:
      'Every time a buyer purchases your design, you earn — without lifting a pencil.',
  },
];

const testimonials = [
  {
    quote:
      'I spent three months going back and forth with a local architect before I found PlanSoko. I bought a three-bedroom plan the same afternoon I signed up. It had everything — the floor plan, elevations, even a materials schedule. My contractor was happy from day one.',
    name: 'Wanjiru M.',
    role: 'Homeowner, Nairobi',
  },
  {
    quote:
      "I develop small rental units outside Nairobi. I've now bought four different plans from PlanSoko for different sites. The quality has been consistent, and the ability to contact the designer with site-specific questions has been genuinely useful.",
    name: 'David O.',
    role: 'Property Developer, Nakuru',
  },
  {
    quote:
      "We're building from the UK and couldn't meet architects in person. PlanSoko gave us a way to browse real plans, see exactly what we'd get, and pay securely without wiring money to someone we'd never met. That trust piece mattered a lot.",
    name: 'Grace & Patrick N.',
    role: 'Building in Kisumu',
  },
];

function StepCard({ step, index }) {
  const Icon = step.icon;
  return (
    <Card className="relative overflow-hidden border border-slate-100 shadow-lg shadow-slate-100/50 hover:shadow-xl hover:shadow-slate-200/80 hover:-translate-y-1 transition-all duration-300 bg-white p-5 flex gap-4 items-start group">
      <div className="flex-shrink-0 w-12 h-12 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
        <Icon className="w-6 h-6" />
      </div>
      <div className="flex-grow">
        <div className="flex items-center justify-between gap-2 mb-1">
          <h4 className="font-sans font-semibold text-slate-800 text-base">{step.title}</h4>
          <span className="text-xs font-semibold font-sans text-slate-400 bg-slate-50 px-2 py-0.5 rounded-full">
            Step {index + 1}
          </span>
        </div>
        <p className="font-sans text-slate-600 text-xs leading-relaxed">{step.description}</p>
      </div>
    </Card>
  );
}

export default function HomePage() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('buyers');
  const [openFaqIndex, setOpenFaqIndex] = useState(0);
  const [availableCategories, setAvailableCategories] = useState([]);
  const [categoriesLoading, setCategoriesLoading] = useState(true);
  useEffect(() => {
    const controller = new AbortController();
    getCategories({ signal: controller.signal })
      .then((items) => { if (!controller.signal.aborted) setAvailableCategories(items.filter((item) => item.is_active)); })
      .catch(() => {})
      .finally(() => { if (!controller.signal.aborted) setCategoriesLoading(false); });
    return () => controller.abort();
  }, []);
  const findCategory = (name) => availableCategories.find((item) => item.name.toLowerCase() === name.toLowerCase());

  const toggleFaq = (index) => {
    setOpenFaqIndex(openFaqIndex === index ? null : index);
  };

  const goToCategory = (slug) => {
    const category = findCategory(slug);
    if (category) navigate(`/plans/${category.id}`);
  };

  return (
    <div className="flex flex-col min-h-screen animate-in fade-in duration-700">
      <Header />

      <section className="relative min-h-[90vh] flex items-center justify-center overflow-hidden bg-slate-900">
        <div className="absolute inset-0 z-0">
          <img
            src="/images/hero.webp"
            alt="Modern architectural house design"
            className="w-full h-full object-cover opacity-90"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-black/40 to-black/40" />
        </div>

        <div className="relative z-10 w-full max-w-7xl mx-auto px-6 pt-20 flex flex-col items-center text-center">
          <h1 className="font-display text-3xl md:text-5xl font-bold text-white tracking-tight mb-6 drop-shadow-xl leading-tight max-w-4xl">
            The house plan you've been looking for is already designed.
          </h1>
          <p className="font-sans text-lg md:text-xl text-slate-100 mb-12 max-w-2xl font-light drop-shadow-md">
            Browse hundreds of verified architectural plans — from bungalows to villas — and download
            instantly. No waiting. No guesswork.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
            <Button
              size="lg"
              onClick={() => navigate('/plans')}
              className="h-12 rounded-lg shadow-lg bg-primary hover:bg-primary/90 text-white transition-transform active:scale-95 font-sans"
            >
              Browse House Plans
            </Button>
            <Button
              size="lg"
              variant="outline"
              onClick={() => navigate('/signUp')}
              className="h-12 rounded-lg shadow-lg border-white/30 bg-white/10 hover:bg-white/20 text-white transition-transform active:scale-95 font-sans"
            >
              Sell Your Designs ?
            </Button>
          </div>
        </div>
      </section>

      <section className="bg-white/80 backdrop-blur-md border-b border-slate-100 py-6 px-6">
        <div className="max-w-7xl mx-auto">
          <ul className="flex flex-col md:flex-row md:flex-wrap md:justify-center gap-3 md:gap-x-8 md:gap-y-2 font-sans text-sm text-slate-600 text-center md:text-left">
            {trustSignals.map((signal, index) => (
              <li key={signal} className="flex items-center justify-center md:justify-start gap-2">
                {index > 0 && (
                  <span className="hidden md:inline text-slate-300" aria-hidden="true">
                    —
                  </span>
                )}
                <span>{signal}</span>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section id="featured-categories" className="py-24 px-6 bg-white">
        <div className="max-w-7xl mx-auto">
          <div className="mb-12 max-w-2xl">
            <h2 className="font-display text-3xl md:text-4xl font-bold text-slate-900 tracking-tight mb-4">
              Browse by Type
            </h2>
            <p className="font-sans text-slate-600 text-md leading-relaxed">
              Every plan on PlanSoko is uploaded by a verified architect or building designer. Browse
              by category to find what fits your plot, budget, and vision.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {categories.map((category) => (
              <Card
                key={category.title}
                onClick={() => goToCategory(category.slug)}
                role="link"
                tabIndex={findCategory(category.slug) ? 0 : -1}
                aria-disabled={!findCategory(category.slug)}
                onKeyDown={(event) => { if (event.key === 'Enter') goToCategory(category.slug); }}
                className="group overflow-hidden rounded-md border-0 shadow-xl shadow-slate-200/50 hover:shadow-2xl hover:shadow-slate-200/80 transition-all duration-500 bg-white cursor-pointer hover:-translate-y-2"
              >
                <div className="relative h-48 overflow-hidden">
                  <img
                    src={category.image}
                    alt={category.title}
                    className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                  />
                  {!findCategory(category.slug) && <span className="absolute top-3 left-3 z-10 rounded bg-white px-3 py-1 text-sm">{categoriesLoading ? 'Loading category...' : 'Category unavailable'}</span>}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent" />
                </div>
                <CardContent className="p-6">
                  <h3 className="font-display text-xl font-bold text-slate-800 mb-2">
                    {category.title}
                  </h3>
                  <p className="font-sans text-slate-600 text-sm leading-relaxed">
                    {category.description}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>

          <div className="mt-12 text-center">
            <Button
              variant="outline"
              onClick={() => navigate('/plans')}
              className="rounded-full px-6 border-slate-300 hover:bg-slate-100 text-slate-700 font-sans"
            >
              View All Categories <ChevronRight className="w-4 h-4 ml-1" />
            </Button>
          </div>
        </div>
      </section>

      <section className="py-24 bg-slate-50 px-6">
        <div className="max-w-7xl mx-auto">
          <div className="mb-12 max-w-2xl">
            <h2 className="font-display text-3xl md:text-4xl font-bold text-slate-900 tracking-tight mb-4">
              Built for Buyers and Builders
            </h2>
            <p className="font-sans text-slate-600 text-md leading-relaxed">
              From the first browse to the final download, PlanSoko is designed to make finding and
              buying a house plan straightforward.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {benefits.map((benefit) => (
              <Card
                key={benefit.title}
                className="rounded-md border-0 shadow-xl shadow-slate-200/50 bg-white p-6 hover:-translate-y-1 transition-all duration-300"
              >
                <benefit.icon className="w-8 h-8 text-primary mb-4" />
                <h3 className="font-display text-xl font-bold text-slate-800 mb-3">
                  {benefit.title}
                </h3>
                <p className="font-sans text-slate-600 text-sm leading-relaxed">
                  {benefit.description}
                </p>
              </Card>
            ))}
          </div>
        </div>
      </section>

      <section className="py-24 px-6 bg-slate-50/50 border-t border-slate-100 relative overflow-hidden">
        <div className="max-w-7xl mx-auto">
          <div className="text-center max-w-2xl mx-auto mb-16">
            <h2 className="font-sans font-extrabold text-3xl md:text-5xl text-slate-900 tracking-tight mb-4">
              How It Works
            </h2>
            <p className="font-sans text-slate-600 text-base leading-relaxed">
              PlanSoko is a two-sided marketplace that connects verified professional designers 
              with homeowners and builders.
            </p>
          </div>

          {/* Premium Tab Switcher (Visible on all screens) */}
          <div className="flex justify-center mb-12">
            <div className="inline-flex bg-slate-100 p-1 rounded-full border border-slate-200 shadow-sm">
              <button
                type="button"
                onClick={() => setActiveTab('buyers')}
                className={`px-6 py-2.5 text-xs md:text-sm font-semibold rounded-full transition-all duration-300 ${
                  activeTab === 'buyers'
                    ? 'bg-primary text-white shadow-md'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                For Buyers
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('sellers')}
                className={`px-6 py-2.5 text-xs md:text-sm font-semibold rounded-full transition-all duration-300 ${
                  activeTab === 'sellers'
                    ? 'bg-primary text-white shadow-md'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                For Sellers
              </button>
            </div>
          </div>

          {/* Horizontal Step Flow (Matches Tihada layout) */}
          <div className="border-y border-slate-200 bg-white">
            <div className="grid grid-cols-1 md:grid-cols-4 divide-y md:divide-y-0 md:divide-x divide-slate-200">
              {(activeTab === 'buyers' ? buyerSteps : sellerSteps).map((step, index) => {
                return (
                  <div key={step.title} className="p-8 md:p-10 hover:bg-slate-50/50 transition-colors duration-300 group">
                    <span className="font-mono text-sm font-semibold text-slate-400 block mb-12">
                      {String(index).padStart(2, '0')}
                    </span>
                    <h3 className="font-sans font-extrabold text-xl md:text-2xl text-slate-900 leading-tight mb-4 group-hover:text-primary transition-colors duration-300">
                      {step.title}
                    </h3>
                    <p className="font-sans text-slate-500 text-sm leading-relaxed">
                      {step.description}
                    </p>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </section>

      <section className="py-24 bg-slate-50 px-6">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {testimonials.map((testimonial) => (
              <Card
                key={testimonial.name}
                className="rounded-md border-0 shadow-xl shadow-slate-200/50 bg-white p-8"
              >
                <blockquote className="font-display italic text-lg text-slate-700 leading-relaxed mb-6">
                  &ldquo;{testimonial.quote}&rdquo;
                </blockquote>
                <footer>
                  <p className="font-display font-semibold text-slate-900">{testimonial.name}</p>
                  <p className="font-sans text-sm text-slate-500 mt-1">{testimonial.role}</p>
                </footer>
              </Card>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-blue-800 text-white py-20 px-6">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="font-display text-3xl md:text-4xl font-bold mb-6 leading-tight">
            Your portfolio deserves more than a WhatsApp catalogue.
          </h2>
          <p className="font-sans text-blue-100 text-lg mb-8 leading-relaxed">
            If you're an architect, building designer, or draftsman with quality plans sitting on
            your hard drive, PlanSoko gives you a proper place to sell them. List once. Earn every
            time someone downloads.
          </p>
          <Button
            size="lg"
            onClick={() => navigate('/signUp')}
            className="h-12 rounded-lg shadow-lg bg-white text-blue-800 hover:bg-blue-50 font-sans mb-4"
          >
            Start Selling on PlanSoko ?
          </Button>
          <p className="font-sans text-sm text-blue-200">
            No upfront cost. You set your own prices.
          </p>
        </div>
      </section>

      <section className="py-24 px-6 bg-white">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="font-display text-3xl md:text-4xl font-bold text-slate-900 mb-6">
            Find a plan worth building.
          </h2>
          <p className="font-sans text-slate-600 text-lg mb-10 leading-relaxed">
            Hundreds of verified designs, ready to download today. Whether you're starting your
            first build or your fifth, your next house plan is already here.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
            <Button
              size="lg"
              onClick={() => navigate('/plans')}
              className="h-12 rounded-lg shadow-lg bg-primary hover:bg-primary/90 text-white font-sans"
            >
              Browse House Designs
            </Button>
            <Button
              size="lg"
              variant="outline"
              className="h-12 rounded-lg border-slate-300 text-slate-700 hover:bg-slate-50 font-sans"
            >
              Have questions? Contact us ?
            </Button>
          </div>
        </div>
      </section>

      <section className="py-24 px-6 bg-white border-t border-slate-100">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-20">
            {/* Left Column */}
            <div className="lg:col-span-5 flex flex-col items-start">
              <div className="inline-block px-3 py-1 rounded-full border border-slate-900 text-xs font-bold font-sans uppercase tracking-wider text-slate-800 mb-6">
                COMMON QUESTIONS
              </div>
              <h2 className="font-sans font-extrabold text-4xl md:text-5xl text-slate-900 tracking-tight leading-none mb-6">
                Before you <br className="hidden md:inline" /> start building.
              </h2>
              <p className="font-sans text-slate-500 text-base leading-relaxed max-w-md">
                Simple answers about buying plans, county approvals, building costs, and construction in Kenya.
              </p>
            </div>

            {/* Right Column (Accordion) */}
            <div className="lg:col-span-7 border-t border-slate-200">
              {frequentlyAsked.map((faq, index) => {
                const isOpen = openFaqIndex === index;
                return (
                  <div key={index} className="border-b border-slate-200 py-6">
                    <button
                      type="button"
                      onClick={() => toggleFaq(index)}
                      className="w-full flex items-center justify-between gap-6 text-left group focus:outline-none"
                    >
                      <span className="font-sans font-extrabold text-xl md:text-2xl text-slate-900 group-hover:text-primary transition-colors duration-300">
                        {faq.question}
                      </span>
                      <span className={`flex-shrink-0 w-8 h-8 rounded-full border border-slate-300 flex items-center justify-center transition-all duration-300 bg-white group-hover:border-slate-800 ${
                        isOpen ? 'border-slate-800' : ''
                      }`}>
                        {isOpen ? (
                          <X className="w-4 h-4 text-slate-800" />
                        ) : (
                          <Plus className="w-4 h-4 text-slate-800" />
                        )}
                      </span>
                    </button>
                    {/* Collapsible Answer */}
                    <div className={`overflow-hidden transition-all duration-300 ease-in-out ${
                      isOpen ? 'max-h-[800px] opacity-100 mt-4' : 'max-h-0 opacity-0 pointer-events-none'
                    }`}>
                      <p className="font-sans text-slate-600 text-sm md:text-base leading-relaxed max-w-2xl">
                        {faq.answer}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}
