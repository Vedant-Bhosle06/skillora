import React from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button, StatTile, Card } from "@/components/ui";
import { useApp } from "@/context/AppContext";

const stats = [
  { label: "Skills Mapped",    value: "2,400+",  sub: "and growing" },
  { label: "Learning Paths",   value: "18,000",  sub: "generated this month" },
  { label: "Avg Time to Role", value: "4.2 mo",  sub: "for active learners" },
  { label: "Demand Accuracy",  value: "94%",     sub: "vs. live job postings" },
];

const steps = [
  { n: "01", title: "Map Your Skills",     body: "Tell us what you know and at what level. Our proficiency model adapts to your answers — no lengthy assessments." },
  { n: "02", title: "Pick a Target Role",  body: "Browse roles ranked by market demand. See exactly which skills you have, which you need, and by how much." },
  { n: "03", title: "Follow Your Path",    body: "An ordered, unlockable roadmap guides you from where you are to where you want to be — no guesswork." },
];

const roadmapTeaser = [
  { label: "Python", status: "done",     hours: 40 },
  { label: "Statistics", status: "done", hours: 32 },
  { label: "Machine Learning", status: "active", hours: 60 },
  { label: "Cloud Platforms", status: "next",  hours: 36 },
  { label: "Deep Learning", status: "locked",  hours: 80 },
];

export default function Landing() {
  const { isLoggedIn, setLoggedIn, setOnboardingDone } = useApp();
  const navigate = useNavigate();

  function handleDemo() {
    setLoggedIn(true);
    setOnboardingDone(true);
    navigate("/dashboard");
  }

  return (
    <div className="bg-background min-h-screen">
      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/8 via-transparent to-accent/6 pointer-events-none" />
        <div className="max-w-6xl mx-auto px-6 pt-24 pb-20 grid md:grid-cols-2 gap-16 items-center">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-secondary rounded-full text-xs font-mono text-secondary-foreground mb-6">
              ◉ Now in beta — join 12,000 learners
            </div>
            <h1 className="font-display font-800 text-5xl md:text-6xl leading-tight text-foreground mb-6">
              Your skill graph.<br />
              <span className="text-primary">Your path forward.</span>
            </h1>
            <p className="text-lg text-muted-foreground leading-relaxed mb-8 max-w-md">
              SKILLORA maps your existing skills onto a knowledge graph, finds your target role, and builds a personalized, ordered learning roadmap — not a random course list.
            </p>
            <div className="flex flex-wrap gap-3">
              {isLoggedIn ? (
                <Button size="lg" onClick={() => navigate("/dashboard")}>Open Dashboard →</Button>
              ) : (
                <>
                  <Button size="lg" onClick={() => navigate("/auth")}>Get started free →</Button>
                  <Button size="lg" variant="ghost" onClick={handleDemo}>View demo</Button>
                </>
              )}
            </div>
          </div>

          {/* Roadmap teaser */}
          <div className="hidden md:block">
            <Card className="p-6">
              <p className="font-display font-700 text-sm text-muted-foreground uppercase tracking-wider mb-4">ML Engineer — Your Path</p>
              <div className="flex flex-col gap-0">
                {roadmapTeaser.map((node, i) => (
                  <div key={node.label} className="flex items-center gap-3">
                    <div className="flex flex-col items-center">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-mono font-500 border-2 transition-all ${
                        node.status === "done"   ? "bg-emerald-500 border-emerald-500 text-white" :
                        node.status === "active" ? "bg-primary border-primary text-white animate-pulse" :
                        node.status === "next"   ? "bg-card border-primary text-primary" :
                        "bg-card border-border text-muted-foreground"
                      }`}>
                        {node.status === "done" ? "✓" : i + 1}
                      </div>
                      {i < roadmapTeaser.length - 1 && (
                        <div className={`w-0.5 h-8 ${node.status === "done" ? "bg-emerald-300 dark:bg-emerald-700" : "bg-border"}`} />
                      )}
                    </div>
                    <div className={`flex-1 py-1 ${node.status === "locked" ? "opacity-40" : ""}`}>
                      <div className="flex items-center justify-between">
                        <span className={`text-sm font-600 ${node.status === "active" ? "text-primary" : "text-foreground"}`}>{node.label}</span>
                        <span className="text-xs font-mono text-muted-foreground">{node.hours}h</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          </div>
        </div>
      </section>

      {/* Stat banner */}
      <section className="border-y border-border bg-card">
        <div className="max-w-6xl mx-auto px-6 py-8 grid grid-cols-2 md:grid-cols-4 gap-4">
          {stats.map(s => <StatTile key={s.label} {...s} />)}
        </div>
      </section>

      {/* How it works */}
      <section className="max-w-6xl mx-auto px-6 py-20">
        <div className="text-center mb-14">
          <p className="font-mono text-xs uppercase tracking-widest text-muted-foreground mb-3">How it works</p>
          <h2 className="font-display font-800 text-4xl text-foreground">Three steps to your next role</h2>
        </div>
        <div className="grid md:grid-cols-3 gap-6">
          {steps.map(s => (
            <Card key={s.n} className="p-6">
              <span className="font-mono font-500 text-4xl text-primary/20 mb-4 block">{s.n}</span>
              <h3 className="font-display font-700 text-lg text-foreground mb-2">{s.title}</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">{s.body}</p>
            </Card>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="bg-primary">
        <div className="max-w-3xl mx-auto px-6 py-20 text-center">
          <h2 className="font-display font-800 text-4xl text-primary-foreground mb-4">Start mapping your growth today</h2>
          <p className="text-primary-foreground/70 mb-8 text-lg">Free forever for individual learners.</p>
          <div className="flex justify-center gap-3">
            <Button size="lg" variant="secondary" onClick={() => navigate("/auth")}>Create free account</Button>
            <Button size="lg" className="bg-white/10 text-white border border-white/20 hover:bg-white/20" onClick={handleDemo}>Live demo</Button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border bg-card">
        <div className="max-w-6xl mx-auto px-6 py-8 flex flex-col md:flex-row items-center justify-between gap-4">
          <span className="font-display font-800 text-foreground">SKILLORA</span>
          <p className="text-xs text-muted-foreground">© 2025 Skillora Inc. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}
