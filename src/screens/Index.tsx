import { useEffect } from "react";
import { useNavigate } from "@/lib/router-adapter";
import { useAuth } from "@/hooks/useAuth";
import { LandingHeader } from "@/components/landing/LandingHeader";
import { HeroSection } from "@/components/landing/HeroSection";
import { FeaturesGrid } from "@/components/landing/FeaturesGrid";
import { IndustryTemplates } from "@/components/landing/IndustryTemplates";
import { QuickSetupSteps } from "@/components/landing/QuickSetupSteps";
import { TestimonialsCarousel } from "@/components/landing/TestimonialsCarousel";
import { UseCasesSection } from "@/components/landing/UseCasesSection";
import { LandingFooter } from "@/components/landing/LandingFooter";

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
