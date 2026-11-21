import { redirect } from 'next/navigation';
import { HeroSlider } from '@/components/site/HeroSlider';
import { StatsSection } from '@/components/site/StatsSection';
import { AboutSection } from '@/components/site/AboutSection';
import { BusinessUnitsSection } from '@/components/site/BusinessUnitsSection';
import { NewsSection } from '@/components/site/NewsSection';
import { PartnersMarquee } from '@/components/site/PartnersMarquee';
import { CTASection } from '@/components/site/CTASection';
import { OffersSection } from '@/components/site/OffersSection';
import { TestimonialsSection } from '@/components/site/TestimonialsSection';
import { PUBLIC_WEBSITE } from '@/lib/edition';

/** The home page is rebuilt every five minutes (the news section reads News & media). */
export const revalidate = 300;

/**
 * Without the public marketing site (lib/edition.ts, PUBLIC_WEBSITE = false)
 * this app is the customer portal: the root goes straight to its sign-in
 * page, as in the Zinox edition. The home page stays in code.
 */
export default function HomePage() {
  if (!PUBLIC_WEBSITE) redirect('/customer-portal');
  return (
    <main>
      <HeroSlider />
      <StatsSection />
      <AboutSection />
      <OffersSection />
      <BusinessUnitsSection />
      <TestimonialsSection />
      <NewsSection />
      <PartnersMarquee />
      <CTASection />
    </main>
  );
}
