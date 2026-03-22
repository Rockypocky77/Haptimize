"use client";

import { PRIVACY_POLICY } from "@/lib/legal-content";
import Link from "next/link";

export default function PrivacyPage() {
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
          {PRIVACY_POLICY.title}
        </h1>
        <p className="text-sm text-neutral-dark/50 mb-8">
          Last Updated: {PRIVACY_POLICY.lastUpdated}
        </p>
        <div className="space-y-6 text-neutral-dark/80">
          {PRIVACY_POLICY.sections.map((section, i) => (
            <section key={i}>
              <h2 className="text-lg font-semibold text-neutral-dark mb-2">
                {section.title}
              </h2>
              {"subsections" in section && section.subsections ? (
                <div className="space-y-4">
                  {section.subsections.map((sub, j) => (
                    <div key={j}>
                      <h3 className="text-base font-medium text-neutral-dark/90 mb-1">
                        {sub.title}
                      </h3>
                      <p className="text-sm leading-relaxed">{sub.content}</p>
                    </div>
                  ))}
                </div>
              ) : (
                "content" in section && (
                  <p className="text-sm leading-relaxed">{section.content}</p>
                )
              )}
            </section>
          ))}
        </div>
      </div>
    </div>
  );
}
