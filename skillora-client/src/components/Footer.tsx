import React from "react";

/** Shown on signed-in pages and on the landing page. */
export default function Footer() {
  return (
    <footer className="border-t-2 border-border">
      <div className="mx-auto flex max-w-6xl flex-col gap-2 px-4 py-8 text-sm text-muted-foreground sm:flex-row sm:items-center sm:justify-between sm:px-8">
        <span>SKILLORA is a college team project.</span>
        <a
          className="inline-flex min-h-11 items-center font-700 text-foreground underline underline-offset-4"
          href="https://github.com/Vedant-Bhosle06/skillora/blob/main/docs/D6_Evaluation_Report.md"
          target="_blank" rel="noreferrer"
        >
          Read the evaluation
        </a>
      </div>
    </footer>
  );
}
