import { InfoPage, InfoSection } from "@/components/InfoPage";

export const metadata = { title: "Terms of Service — InsureFlow" };

export default function TermsPage() {
  return (
    <InfoPage
      title="Terms of Service"
      intro="Last updated: January 1, 2026 · This is a demo document for illustration purposes only."
    >
      <InfoSection heading="1. Acceptance of Terms">
        <p>
          By accessing the InsureFlow Broker Portal, you agree to use the platform in accordance
          with these terms and all applicable insurance laws and regulations.
        </p>
      </InfoSection>

      <InfoSection heading="2. Broker Responsibilities">
        <p>
          Brokers are responsible for the accuracy of information entered during the quoting
          process. Quotes are estimates and are subject to underwriting review and final approval.
        </p>
      </InfoSection>

      <InfoSection heading="3. Quotes & Binding">
        <p>
          An Accept decision does not constitute a bound policy until the &ldquo;Buy This
          Policy&rdquo; step is completed and a confirmation has been issued. Premiums and coverage
          terms may change following formal underwriting.
        </p>
      </InfoSection>

      <InfoSection heading="4. Acceptable Use">
        <p>
          The platform may not be used for any unlawful purpose or to submit fraudulent
          applications. Accounts found in violation may be suspended.
        </p>
      </InfoSection>

      <InfoSection heading="5. Limitation of Liability">
        <p>
          InsureFlow provides the portal &ldquo;as is&rdquo; for the purpose of generating insurance
          quotes and is not liable for decisions made based on estimated quotes.
        </p>
      </InfoSection>
    </InfoPage>
  );
}
