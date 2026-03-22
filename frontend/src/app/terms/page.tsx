"use client";

import { TERMS_OF_SERVICE } from "@/lib/legal-content";
import Link from "next/link";

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-neutral-light p-6 md:p-12">
      <div className="max-w-2xl mx-auto">
        <Link
          href="/"
          className="text-sm text-primary hover:underline mb-6 inline-block"
        >
          ← Back to Haptimize
        </Link>
        <h1 className="text-2xl font-bold text-neutral-dark mb-2">
          {TERMS_OF_SERVICE.title}
        </h1>
        <p className="text-sm text-neutral-dark/50 mb-8">
          Last Updated: {TERMS_OF_SERVICE.lastUpdated}
        </p>
        <div className="space-y-6 text-neutral-dark/80">
          {TERMS_OF_SERVICE.sections.map((section, i) => (
            <section key={i}>
              <h2 className="text-lg font-semibold text-neutral-dark mb-2">
                {section.title}
              </h2>
              {"content" in section && (
                <p className="text-sm leading-relaxed">{section.content}</p>
              )}
            </section>
          ))}
        </div>
      </div>
    </div>
  );
}
