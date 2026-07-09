import { Footer } from "@/components/layout/footer";
import { Navbar } from "@/components/layout/navbar";
import { ArchitectureSection } from "@/features/marketing/components/architecture-section";
import { CtaSection } from "@/features/marketing/components/cta-section";
import { HeroSection } from "@/features/marketing/components/hero-section";
import { SignalSection } from "@/features/marketing/components/signal-section";
import { ValueGrid } from "@/features/marketing/components/value-grid";
import { marketingNavItems } from "@/lib/mock-data/navigation";

export default function MarketingPage() {
  return (
    <>
      <Navbar items={marketingNavItems} />
      <main>
        <HeroSection />
        <ValueGrid />
        <ArchitectureSection />
        <SignalSection />
        <CtaSection />
      </main>
      <Footer />
    </>
  );
}
