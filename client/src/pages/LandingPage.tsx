import { PageShell } from '../components/layout/PageShell';
import { Hero } from '../components/sections/Hero';
import { FactStrip } from '../components/sections/FactStrip';
import { FeaturedTopics } from '../components/sections/FeaturedTopics';
import { HowItWorks } from '../components/sections/HowItWorks';
import { ComparisonPreview } from '../components/sections/ComparisonPreview';
import { ExpertFingerprint } from '../components/sections/ExpertFingerprint';
import { FinalCta } from '../components/sections/FinalCta';

export function LandingPage() {
  return (
    <PageShell>
      <Hero />
      <FactStrip />
      <FeaturedTopics />
      <HowItWorks />
      <ComparisonPreview />
      <ExpertFingerprint />
      <FinalCta />
    </PageShell>
  );
}

export default LandingPage;
