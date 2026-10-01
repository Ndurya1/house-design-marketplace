import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ChevronDown, Mail } from 'lucide-react';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { helpFaqs, manualRecoverySteps, SUPPORT_EMAIL, SUPPORT_MAILTO } from '@/lib/supportContent';

export default function HelpPage() {
  const [openTopic, setOpenTopic] = useState(helpFaqs[0].id);

  return <div className="min-h-screen flex flex-col bg-white"><Header />
    <main className="flex-1 px-5 pb-20 pt-28 sm:px-8 lg:px-12">
      <div className="mx-auto max-w-4xl space-y-12">
        <div className="max-w-2xl">
          <p className="text-xs font-semibold uppercase tracking-[.2em] text-blue-600">Support</p>
          <h1 className="mt-3 text-4xl font-bold tracking-tight text-slate-900 sm:text-5xl">Help with your plan or order.</h1>
          <p className="mt-6 text-base leading-7 text-slate-600">Find guidance for payments, downloads, licensing and designer listings. If you need help with a guest order, support can check it manually.</p>
          <a href={SUPPORT_MAILTO} className="mt-8 inline-flex min-h-11 items-center gap-2 rounded-lg bg-blue-700 px-5 py-3 font-semibold text-white hover:bg-blue-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-700"><Mail aria-hidden="true" className="h-4 w-4" />Email {SUPPORT_EMAIL}</a>
        </div>

        <section aria-labelledby="manual-recovery-heading" className="rounded-2xl border border-blue-200 bg-blue-50 p-6 sm:p-8">
          <h2 id="manual-recovery-heading" className="text-2xl font-bold text-slate-900">Manual guest-order recovery</h2>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-700">Guest checkout access can expire. Email support instead of sending order details through an unverified form; support will verify entitlement on the server before advising you.</p>
          <ol className="mt-5 grid gap-4 text-sm leading-6 text-slate-700">
            {manualRecoverySteps.map((step, index) => <li key={step} className="flex gap-3"><span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-blue-700 text-xs font-bold text-white">{index + 1}</span><span>{step}</span></li>)}
          </ol>
        </section>

        <section aria-labelledby="help-topics-heading">
          <h2 id="help-topics-heading" className="text-2xl font-bold text-slate-900">Common questions</h2>
          <div className="mt-5 divide-y divide-slate-200 border-y border-slate-200">
            {helpFaqs.map(topic => <div key={topic.id}>
              <button type="button" aria-expanded={openTopic === topic.id} aria-controls={`help-topic-${topic.id}`} onClick={() => setOpenTopic(openTopic === topic.id ? null : topic.id)} className="flex min-h-16 w-full items-center justify-between gap-5 py-4 text-left font-semibold text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-700">{topic.question}<ChevronDown aria-hidden="true" className={`h-5 w-5 shrink-0 text-slate-400 transition-transform motion-reduce:transition-none ${openTopic === topic.id ? 'rotate-180' : ''}`} /></button>
              {openTopic === topic.id && <p id={`help-topic-${topic.id}`} className="max-w-3xl pb-5 pr-8 text-sm leading-6 text-slate-600">{topic.answer}</p>}
            </div>)}
          </div>
        </section>

        <div className="flex flex-wrap gap-4 border-t border-slate-200 pt-6 text-sm">
          <Link to="/plans" className="font-semibold text-blue-700 underline">Browse house designs</Link>
        </div>
      </div>
    </main>
    <Footer />
  </div>;
}
