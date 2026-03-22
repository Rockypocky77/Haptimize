/** Bump this when terms or privacy policy change to force re-consent */
export const CURRENT_TERMS_VERSION = "2026-03-07";

export const TERMS_OF_SERVICE = {
  title: "Haptimize Terms of Service",
  lastUpdated: "03/07/2026 (MM/DD/YY)",
  sections: [
    {
      title: "1. Overview",
      content:
        "Welcome to Haptimize. Haptimize is a productivity and habit-tracking web application that helps users manage habits, reminders, calendars, and AI-assisted productivity tools. By accessing or using Haptimize, you agree to these Terms of Service. If you do not agree to these Terms, do not use the service.",
    },
    {
      title: "2. Eligibility",
      content:
        "You must be at least 13 years old to use Haptimize. If you are under the age of 18, you must have permission from a parent or legal guardian. Haptimize is not intended for children under 13.",
    },
    {
      title: "3. Accounts",
      content:
        "To use certain features, you may create an account using: email and password, Google sign-in, or anonymous/demo mode. You agree to: provide accurate information, keep your login credentials secure, and notify us of unauthorized access. You are responsible for activity that occurs under your account.",
    },
    {
      title: "4. Demo Mode",
      content:
        "Haptimize may offer a demo or anonymous mode that allows limited access without creating an account. Data created in demo mode may not be stored permanently and may be deleted at any time.",
    },
    {
      title: "5. Service Features",
      content:
        "Haptimize may include features such as: habit tracking, reminders and calendar management, productivity analytics, and AI-powered assistant (“Hapti AI”). Features may change or be discontinued at any time.",
    },
    {
      title: "6. AI Disclaimer",
      content:
        "Haptimize includes an AI assistant powered by third-party AI technology. AI responses: may be inaccurate, may be incomplete, and should not be relied upon for medical, legal, financial, or professional advice. You use AI features at your own risk.",
    },
    {
      title: "7. Acceptable Use",
      content:
        "You agree not to use Haptimize to: violate any laws, upload harmful or abusive content, attempt to hack or exploit the system, interfere with service operation, attempt prompt injection or manipulation of AI systems, or spam or abuse the platform. We may suspend or terminate accounts that violate these rules.",
    },
    {
      title: "8. User Content",
      content:
        "You retain ownership of the content you create in Haptimize, including: habits, reminders, categories, and messages sent to Hapti AI. However, you grant Haptimize a limited license to store, process, and display this content to operate the service.",
    },
    {
      title: "9. Third-Party Services",
      content:
        "Haptimize relies on third-party services including: Google Firebase, OpenAI, and Resend. Your use of Haptimize may involve sending data to these services according to their respective privacy policies. We are not responsible for the practices of third-party providers.",
    },
    {
      title: "10. Availability",
      content:
        "Haptimize is provided “as is” and “as available.” We do not guarantee: uninterrupted access, error-free operation, or permanent storage of data.",
    },
    {
      title: "11. Limitation of Liability",
      content:
        "To the fullest extent permitted by law, Haptimize and its operators shall not be liable for: indirect or consequential damages, data loss, service interruptions, reliance on AI responses, or loss of productivity or business. Total liability shall not exceed the amount paid by the user (if any) in the previous 12 months.",
    },
    {
      title: "12. Termination",
      content:
        "We may suspend or terminate accounts if: these Terms are violated, misuse or abuse occurs, or required by law. Users may delete their account at any time through the settings page.",
    },
    {
      title: "13. Changes to the Service",
      content:
        "We may modify, suspend, or discontinue features of Haptimize at any time without notice.",
    },
    {
      title: "14. Governing Law",
      content:
        "These Terms are governed by the laws of the United States and the State of North Carolina, without regard to conflict of law principles.",
    },
    {
      title: "15. Contact",
      content: "For questions about these Terms: Email: haptimize@gmail.com",
    },
  ],
};

export const PRIVACY_POLICY = {
  title: "Haptimize Privacy Policy",
  lastUpdated: "03/07/2026 (MM/DD/YY)",
  sections: [
    {
      title: "1. Information We Collect",
      subsections: [
        {
          title: "1.1 Account Information",
          content:
            "When you create an account, we may collect: email address, display name, and authentication provider (email or Google). Authentication is handled through Firebase Authentication.",
        },
        {
          title: "1.2 User Content",
          content:
            "We store information created by users including: habits, habit completion logs, reminders, reminder categories, calendar events, and daily productivity statistics.",
        },
        {
          title: "1.3 AI Conversations",
          content:
            "Messages sent to Hapti AI may be processed by third-party AI services. To generate responses, the system may send: your message, recent chat history, and relevant reminders or context.",
        },
        {
          title: "1.4 Technical Information",
          content:
            "We may collect limited technical data including: IP address (for rate limiting and security), user ID, and system activity logs.",
        },
        {
          title: "1.5 Local Storage",
          content:
            "Your browser may store small pieces of data locally, including: theme preference (light/dark).",
        },
      ],
    },
    {
      title: "2. How We Use Information",
      content:
        "We use collected information to: provide and operate the service, authenticate users, store habits reminders and productivity data, generate AI responses, send verification emails, and prevent abuse and maintain security.",
    },
    {
      title: "3. Third-Party Services",
      content:
        "Haptimize uses the following third-party providers: Firebase (Google) for authentication and database storage; OpenAI for AI assistant responses and content moderation; Resend to send email verification codes. Each provider has its own privacy policy governing how they process data.",
    },
    {
      title: "4. Data Retention",
      content:
        "User data is retained until: the user deletes it or the account is deleted. Users can delete data through: wipe data (removes habits, reminders, logs, and stats) or delete account. Some third-party providers may retain logs according to their own policies.",
    },
    {
      title: "5. Security",
      content:
        "We implement security measures including: access controls in the database, rate limiting, security headers, and restricted API access. However, no internet system is completely secure.",
    },
    {
      title: "6. Children's Privacy",
      content:
        "Haptimize is not intended for children under 13 years old. If we learn that we have collected personal information from a child under 13, we will delete it.",
    },
    {
      title: "7. International Data Transfers",
      content:
        "Data may be processed on servers operated by third-party providers located outside your country.",
    },
    {
      title: "8. Your Rights",
      content:
        "Users may: access their data, modify account settings, delete stored data, and delete their account. These actions are available within the app settings.",
    },
    {
      title: "9. Changes to This Policy",
      content:
        "We may update this Privacy Policy periodically. Updates will be reflected by the “Last Updated” date.",
    },
    {
      title: "10. Contact",
      content: "For privacy questions: Email: haptimize@gmail.com",
    },
  ],
};
