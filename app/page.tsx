import Features from '@/components/landing/Features';
import Footer from '@/components/landing/Footer';
import { HeroSection } from '@/components/landing/Hero';
import HowItWorks from '@/components/landing/HowItWorks';
import TechStack from '@/components/landing/TechStack';
import TopBar from '@/components/landing/TopBar';
import WhyIBuiltThis from '@/components/landing/WhyIBuiltThis';

export default function LandingPage() {
  return (
    <div className="min-h-screen z-10 text-text-primary">
      <TopBar />
      <HeroSection />
      <Features />
      <HowItWorks />
      <WhyIBuiltThis />
      <TechStack />
      <Footer />
    </div>
  );
}
