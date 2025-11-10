"use client";

import { useState } from "react";

export default function FAQ() {
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  const faqs = [
    {
      question: "Is this a surveillance tool?",
      answer:
        "No. DevImpact is built FOR engineers, not to monitor them. Your data is private by default. You control what to share and when. We don't build team rankings, productivity scores, or manager-only dashboards.",
    },
    {
      question: "Can my manager see my data?",
      answer:
        "Only what you choose to share. By default, everything in DevImpact is private to you. You can export summaries to share during reviews, but nothing is automatically visible to managers.",
    },
    {
      question: "How much does it cost?",
      answer:
        "DevImpact is free during beta. After launch, we'll offer a free tier (basic features) and Pro tier (~$10/month) with better summaries, unlimited history, and advanced insights. Beta users get 50% off forever.",
    },
    {
      question: "What data do you collect?",
      answer:
        "We sync GitHub metadata (PR titles, reviews, commits - not code) and optionally Google Calendar events (meeting titles, duration). Just enough to track your contributions and understand your time. Everything is encrypted and private to you. Your code and meeting details stay private. Always.",
    },
    {
      question: "How long does setup take?",
      answer:
        "30 seconds to connect. Depending on your company's GitHub settings, you may need org admin approval to access private repos. We'll let you know during setup if approval is required.",
    },
    {
      question: "Do I need to use it every day?",
      answer:
        "No. DevImpact works in the background. Check it when you need it—during review prep, promotion packet writing, or updating your resume. Most engineers use it quarterly.",
    },
  ];

  return (
    <section className="relative overflow-hidden">
      <div className="pointer-events-none absolute inset-0" aria-hidden="true">
        <div
          className="absolute top-1/2 left-1/2 h-160 w-160 -translate-x-1/2 -translate-y-1/2 rounded-full blur-3xl opacity-20"
          style={{
            background:
              "radial-gradient(closest-side, var(--color-accent), transparent 80%)",
          }}
        />
      </div>

      <div className="relative mx-auto max-w-4xl px-6 py-24">
        <div className="text-center mb-16">
          <h2 className="text-4xl font-extrabold tracking-tight text-text-primary">
            Frequently Asked Questions
          </h2>
          <p className="mt-4 text-lg text-text-secondary">
            Everything you need to know about DevImpact
          </p>
        </div>

        <div className="space-y-4">
          {faqs.map((faq, index) => (
            <div
              key={index}
              className="rounded-xl border border-border bg-surface overflow-hidden transition-colors hover:border-[oklch(0.65_0.05_255)]"
            >
              <button
                onClick={() => setOpenIndex(openIndex === index ? null : index)}
                className="w-full text-left px-6 py-5 flex items-center justify-between"
              >
                <h3 className="text-lg font-semibold text-text-primary pr-8">
                  {faq.question}
                </h3>
                <svg
                  className={`w-5 h-5 text-text-secondary transition-transform ${
                    openIndex === index ? "rotate-180" : ""
                  }`}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M19 9l-7 7-7-7"
                  />
                </svg>
              </button>
              {openIndex === index && (
                <div className="px-6 pb-5">
                  <p className="text-text-secondary leading-relaxed">
                    {faq.answer}
                  </p>
                </div>
              )}
            </div>
          ))}
        </div>

        <div className="mt-16 text-center">
          <p className="text-text-secondary mb-4">Have more questions?</p>
          <a
            href="mailto:hello@devimpact.app"
            className="inline-flex items-center justify-center rounded-xl border border-border bg-surface px-6 py-3 font-medium text-text-primary hover:border-[oklch(0.65_0.05_255)] transition-colors"
          >
            Get in touch
          </a>
        </div>
      </div>
    </section>
  );
}
