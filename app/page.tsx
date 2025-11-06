import Footer from "@/components/landing/Footer";
import Hero from "@/components/landing/Hero";
import HowItWorks from "@/components/landing/HowItWorks";
import TopBar from "@/components/landing/TopBar";

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-background text-text-primary">
      <TopBar />
      <Hero />
      <HowItWorks />
      <Footer />
    </div>
  );
}
