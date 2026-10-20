import React from "react";
import { usePrefersReducedMotion } from "@/hooks/usePrefersReducedMotion";
import Footer from "@/components/Footer";
import LandingHeader from "@/components/landing/LandingHeader";
import Hero from "@/components/landing/Hero";
import StillHero from "@/components/landing/StillHero";
import FromHere from "@/components/landing/FromHere";
import Status from "@/components/landing/Status";
import Destinations from "@/components/landing/Destinations";
import Close from "@/components/landing/Close";

// Homepage: the learning path as a metro line. Every figure comes from the real dataset snapshot
// (src/content/landing-graph.json). Works in light and dark mode; reduced motion gets a still hero.
export default function Landing() {
  const reduced = usePrefersReducedMotion();
  return (
    <div className="min-h-screen bg-background text-foreground">
      <LandingHeader />
      <main>
        {reduced ? <StillHero /> : <Hero />}
        <FromHere />
        <Status />
        <Destinations />
        <Close />
      </main>
      <Footer />
    </div>
  );
}
