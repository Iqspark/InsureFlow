import { InfoPage, InfoSection } from "@/components/InfoPage";

export const metadata = { title: "Privacy Policy — InsureFlow" };

export default function PrivacyPage() {
  return (
    <InfoPage
      title="Privacy Policy"
      intro="Last updated: January 1, 2026 · This is a demo document for illustration purposes only."
    >
      <InfoSection heading="1. Information We Collect">
        <p>
          InsureFlow collects information that brokers enter when preparing a quote, including
          applicant names, contact details, and property information. We also collect basic account
          details for authenticated brokers.
        </p>
      </InfoSection>

      <InfoSection heading="2. How We Use Information">
        <p>
          Information is used solely to generate insurance quotes, produce policy documents, and
          send confirmation emails on behalf of the broker. We do not sell personal information to
          third parties.
        </p>
      </InfoSection>

      <InfoSection heading="3. Data Retention">
        <p>
          Quote and policy records are retained for the duration of the broker relationship and as
          required by applicable insurance regulations. Brokers may request deletion of draft
          records at any time.
        </p>
      </InfoSection>

      <InfoSection heading="4. Security">
        <p>
          Access is restricted to authenticated brokers, and every submission is isolated to the
          broker who created it. Data is transmitted over encrypted connections.
        </p>
      </InfoSection>

      <InfoSection heading="5. Contact">
        <p>
          Questions about this policy can be directed to{" "}
          <a href="mailto:privacy@insureflow.com" className="text-indigo-600 hover:underline">
            privacy@insureflow.com
          </a>
          .
        </p>
      </InfoSection>
    </InfoPage>
  );
}
