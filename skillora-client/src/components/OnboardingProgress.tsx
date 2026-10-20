import React from "react";
import { CheckIcon } from "@/components/transit/icons";

/** The two onboarding stops as a short line: step 1 (skills) then step 2 (destination). */
export default function OnboardingProgress({ step }: { step: 1 | 2 }) {
  const stops = ["Your skills", "Your destination"];
  return (
    <ol className="flex items-center" aria-label="Onboarding progress">
      {stops.map((label, i) => {
        const n = i + 1;
        const done = step > n, current = step === n;
        return (
          <React.Fragment key={label}>
            {i > 0 && <li aria-hidden="true" className={`mx-2 h-1 w-10 rounded-full sm:w-20 ${step >= n ? "bg-primary" : "bg-border"}`} />}
            <li className="flex items-center gap-2" aria-current={current ? "step" : undefined}>
              <span className={`flex h-7 w-7 items-center justify-center rounded-full border-[3px] text-xs font-800 ${
                done ? "border-primary bg-primary text-primary-foreground" : current ? "border-foreground bg-station text-foreground" : "border-line-grey bg-station text-muted-foreground"
              }`}>
                {done ? <CheckIcon size={14} /> : n}
              </span>
              <span className={`text-sm ${current ? "font-800 text-foreground" : "font-600 text-muted-foreground"}`}>
                {label}<span className="sr-only">{done ? " (done)" : current ? " (current step)" : ""}</span>
              </span>
            </li>
          </React.Fragment>
        );
      })}
    </ol>
  );
}
