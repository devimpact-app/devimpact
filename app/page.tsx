import FAQ from "@/components/landing/Faq";
import Footer from "@/components/landing/Footer";
import Hero from "@/components/landing/Hero";
import HowItWorks from "@/components/landing/HowItWorks";
import TopBar from "@/components/landing/TopBar";

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-background text-text-primary">
      <TopBar />
      <Hero />
      <div className="mt-10 max-w-4xl mx-auto grid gap-5 md:grid-cols-2">
        {" "}
        {[
          {
            title: "Your weekly pulse",
            body: "A clear snapshot of how you’re working — review flow, PR cadence, and your recent shipped changes.",
            variant: "primary" as const,
          },
          {
            title: "Your work rhythm",
            body: "See when you naturally do your best work. A weekly heatmap of when you code, review, and focus — so you can protect your peak hours.",
            variant: "default" as const,
          },
          {
            title: "Your engineering insights",
            body: "See patterns like first-responder load, who you collaborate with most, and how your iteration tempo shifts over time.",
            variant: "default" as const,
          },
          {
            title: "Prep for your next 1:1",
            body: "Auto-collect your wins, questions, blockers, and recent work into a clean, ready-to-share 1:1 view.",
            variant: "default" as const,
          },
        ].map((item) => (
          <div
            key={item.title}
            className={`
      group relative overflow-hidden
      rounded-2xl border px-5 py-4
      transition-transform transition-colors duration-150
      ${
        item.variant === "primary"
          ? "border-[#3B4A78] bg-[#0B1020]"
          : "border-[#252B3F] bg-[#090D16]"
      }
      hover:-translate-y-[2px] hover:border-[#3B4A78] hover:bg-[#0D1220]
    `}
          >
            <div className="mb-3 h-px w-10 bg-gradient-to-r from-[#6E8BFF] to-[#34D1C6]" />

            <h3 className="text-xs font-semibold tracking-wide text-[#E2E6FF] mb-1">
              {item.title}
            </h3>
            <p className="text-[11px] text-[#9AA4C6] leading-snug">
              {item.body}
            </p>
          </div>
        ))}
      </div>
      <HowItWorks />
      <FAQ />
      <Footer />
    </div>
  );
}
