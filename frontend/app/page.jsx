import Hero from '../components/landing/Hero';
import SocialProof from '../components/landing/SocialProof';
import HowItWorks from '../components/landing/HowItWorks';
import FeaturesGrid from '../components/landing/FeaturesGrid';
import PhoneMockup from '../components/landing/PhoneMockup';
import WhoIsThisFor from '../components/landing/WhoIsThisFor';
import Security from '../components/landing/Security';
import CTAFooter from '../components/landing/CTAFooter';
import Footer from '../components/landing/Footer';

export default function LandingPage() {
  return (
    <main className="bg-fafnir-black min-h-screen">
      <Hero />
      <SocialProof />
      <HowItWorks />
      <FeaturesGrid />
      <PhoneMockup />
      <WhoIsThisFor />
      <Security />
      <CTAFooter />
      <Footer />
    </main>
  );
}
