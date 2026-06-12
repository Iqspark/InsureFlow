import { InfoPage, InfoSection } from "@/components/InfoPage";

export const metadata = { title: "Support — InsureFlow" };

export default function SupportPage() {
  return (
    <InfoPage
      title="Support"
      intro="Need a hand? Here's how to reach the InsureFlow team. This is a demo page for illustration purposes only."
    >
      <InfoSection heading="Contact Us">
        <p>
          Email:{" "}
          <a href="mailto:support@insureflow.com" className="text-indigo-600 hover:underline">
            support@insureflow.com
          </a>
        </p>
        <p>Phone: 1-800-555-0142 (Mon–Fri, 9am–5pm ET)</p>
      </InfoSection>

      <InfoSection heading="Help Navigator">
        <p>
          For quick answers while quoting, use the Help Navigator widget in the bottom-right corner
          of any page. It can explain underwriting rules, pricing, and how to change an answer.
        </p>
      </InfoSection>

      <InfoSection heading="Frequently Asked">
        <p>
          <strong>How do I resume a draft quote?</strong> Open it from the Dashboard or Search and
          click &ldquo;Resume Quote&rdquo;.
        </p>
        <p>
          <strong>How do I download a quote?</strong> Open any quote and click &ldquo;Download
          PDF&rdquo;.
        </p>
        <p>
          <strong>Why didn&rsquo;t the confirmation email arrive?</strong> Check that the applicant
          email is correct and that the mail server is configured.
        </p>
      </InfoSection>
    </InfoPage>
  );
}
