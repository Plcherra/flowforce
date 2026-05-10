import { useEffect } from "react";
import { useNavigate } from "@/lib/router-adapter";
import { useAuth } from "@/hooks/useAuth";
import { LandingHeader } from "@/features/marketing/components/LandingHeader";
import { HeroSection } from "@/features/marketing/components/HeroSection";
import { FeaturesGrid } from "@/features/marketing/components/FeaturesGrid";
import { IndustryTemplates } from "@/features/marketing/components/IndustryTemplates";
import { QuickSetupSteps } from "@/features/marketing/components/QuickSetupSteps";
import { TestimonialsCarousel } from "@/features/marketing/components/TestimonialsCarousel";
import { UseCasesSection } from "@/features/marketing/components/UseCasesSection";
import { LandingFooter } from "@/features/marketing/components/LandingFooter";

export default function Index() {
  const navigate = useNavigate();
  const { user, loading } = useAuth();

  useEffect(() => {
    if (user && !loading) {
      navigate("/app/dashboard");
    }
  }, [user, loading, navigate]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#3F51B5]"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      {/* Fixed Header */}
      <LandingHeader />

      {/* Main Content with proper spacing for fixed header */}
      <main>
        {/* Hero Section with video background */}
        <HeroSection />

        {/* Features Grid with hover animations */}
        <section id="features">
          <FeaturesGrid />
        </section>

        {/* Industry Templates with custom illustrations */}
        <section id="industries">
          <IndustryTemplates />
        </section>

        {/* Quick Setup Steps with micro-animations */}
        <QuickSetupSteps />

        {/* Customer Testimonials Carousel */}
        <TestimonialsCarousel />

        {/* Use Cases with real-world stats */}
        <UseCasesSection />
      </main>

      {/* Footer with newsletter and dark mode */}
      <LandingFooter />
    </div>
  );
}
