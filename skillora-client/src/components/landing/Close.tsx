import React from "react";
import { Link } from "react-router-dom";
import { useAuth } from "@/auth/AuthContext";
import PlanCta from "./PlanCta";
import { PILL_OUTLINE } from "./data";

export default function Close() {
  const { status, user } = useAuth();
  const signedIn = status === "authenticated" && user !== null;
  return (
    <section className="border-t-2 border-border">
      <div className="mx-auto flex max-w-6xl flex-col items-start gap-6 px-4 py-20 sm:px-8 md:flex-row md:items-end md:justify-between">
        <h2 className="max-w-2xl text-[clamp(2.4rem,6vw,5rem)] font-[900] leading-[0.98] tracking-[-0.025em]">Start from your own station.</h2>
        <div className="flex flex-wrap gap-3">
          <PlanCta />
          {!signedIn && <Link to="/login" className={PILL_OUTLINE}>Sign in</Link>}
        </div>
      </div>
    </section>
  );
}
