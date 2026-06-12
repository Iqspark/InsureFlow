import React from "react";
import {
  Document,
  Page,
  View,
  Text,
  Image,
  StyleSheet,
  renderToBuffer,
} from "@react-pdf/renderer";

// Vector PDF of the full quote / policy details, downloaded directly
// from /api/policy/[id]/document. Pure Node — no headless browser.
// Product-agnostic: the route supplies pre-built sections.

export interface PolicyPdfData {
  appId: string;
  policyType: string;
  applicantName: string | null;
  createdAt: Date;
  updatedAt: Date;
  decision: string | null;
  purchased?: boolean;
  reasons: string[];
  annualPremium: number | null;
  monthlyPremium: number | null;
  coverageAmount: number | null;
  sections: { title: string; rows: { label: string; value: string }[] }[];
  propertyAddress?: string | null;
  mapImage?: string | null; // base64 data URI of the static map
}

const fmtCurrency = (v: number | null | undefined): string =>
  v === null || v === undefined
    ? "—"
    : new Intl.NumberFormat("en-CA", {
        style: "currency",
        currency: "CAD",
        maximumFractionDigits: 0,
      }).format(v);

const fmtDate = (d: Date): string =>
  new Date(d).toLocaleDateString("en-CA", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

const styles = StyleSheet.create({
  page: { fontFamily: "Helvetica", fontSize: 10, color: "#0f172a", paddingBottom: 48 },
  header: {
    backgroundColor: "#4f46e5",
    paddingVertical: 22,
    paddingHorizontal: 36,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-end",
  },
  brand: { color: "#ffffff", fontSize: 20, fontFamily: "Helvetica-Bold" },
  tag: { color: "#c7d2fe", fontSize: 9, marginTop: 4 },
  appidLabel: { color: "#c7d2fe", fontSize: 8, textAlign: "right" },
  appid: { color: "#ffffff", fontSize: 15, fontFamily: "Helvetica-Bold", textAlign: "right" },

  body: { paddingHorizontal: 36, paddingTop: 22 },
  titleRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 14,
  },
  applicant: { fontSize: 16, fontFamily: "Helvetica-Bold" },
  policyType: { fontSize: 9, color: "#64748b", marginTop: 4 },
  badgeCol: { flexDirection: "column", alignItems: "flex-end", gap: 4 },
  badge: { paddingVertical: 5, paddingHorizontal: 12, borderRadius: 10, fontSize: 10, fontFamily: "Helvetica-Bold" },
  stageBadge: { paddingVertical: 4, paddingHorizontal: 12, borderRadius: 10, fontSize: 9, fontFamily: "Helvetica-Bold" },

  premium: {
    flexDirection: "row",
    borderWidth: 1,
    borderColor: "#e2e8f0",
    borderRadius: 8,
    marginBottom: 6,
  },
  premiumCell: { flex: 1, paddingVertical: 14, alignItems: "center", borderRightWidth: 1, borderRightColor: "#e2e8f0" },
  premiumCellLast: { flex: 1, paddingVertical: 14, alignItems: "center" },
  premiumLabel: { fontSize: 8, color: "#94a3b8", marginBottom: 4, textTransform: "uppercase" },
  premiumValue: { fontSize: 16, fontFamily: "Helvetica-Bold" },
  premiumSub: { fontSize: 8, color: "#94a3b8", marginTop: 2 },

  reasons: {
    backgroundColor: "#f8fafc",
    borderLeftWidth: 3,
    borderLeftColor: "#cbd5e1",
    paddingVertical: 10,
    paddingHorizontal: 14,
    marginVertical: 10,
  },
  reasonsTitle: { fontSize: 8, fontFamily: "Helvetica-Bold", color: "#475569", textTransform: "uppercase", marginBottom: 5 },
  reasonItem: { fontSize: 9, color: "#475569", marginBottom: 2 },

  mapImage: { width: "100%", height: 170, borderRadius: 6, objectFit: "cover" },
  mapAddress: { fontSize: 9, color: "#64748b", marginTop: 5 },

  section: { marginTop: 16 },
  sectionTitle: {
    fontSize: 8,
    fontFamily: "Helvetica-Bold",
    color: "#94a3b8",
    textTransform: "uppercase",
    paddingBottom: 5,
    marginBottom: 6,
    borderBottomWidth: 1,
    borderBottomColor: "#e2e8f0",
  },
  row: { flexDirection: "row", paddingVertical: 4 },
  label: { width: "45%", color: "#64748b", fontSize: 10 },
  value: { width: "55%", color: "#0f172a", fontSize: 10, fontFamily: "Helvetica-Bold" },

  footer: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: "#0f172a",
    paddingVertical: 14,
    paddingHorizontal: 36,
    alignItems: "center",
  },
  footerTitle: { color: "#ffffff", fontSize: 9, fontFamily: "Helvetica-Bold" },
  footerMuted: { color: "#475569", fontSize: 8, marginTop: 3, textAlign: "center" },
});

function PolicyPdf({ d }: { d: PolicyPdfData }) {
  const decision = d.decision ?? "draft";
  const cfg: Record<string, { label: string; color: string; bg: string }> = {
    accept: { label: "Accepted", color: "#047857", bg: "#d1fae5" },
    decline: { label: "Declined", color: "#b91c1c", bg: "#fee2e2" },
    refer: { label: "Referred", color: "#b45309", bg: "#fef3c7" },
    draft: { label: "Draft", color: "#475569", bg: "#e2e8f0" },
  };
  const dc = cfg[decision] ?? cfg.draft;

  return (
    <Document title={`Policy ${d.appId} — InsureFlow`} author="InsureFlow">
      <Page size="A4" style={styles.page}>
        <View style={styles.header} fixed>
          <View>
            <Text style={styles.brand}>InsureFlow</Text>
            <Text style={styles.tag}>Broker Portal · {d.policyType}</Text>
          </View>
          <View>
            <Text style={styles.appidLabel}>APPLICATION ID</Text>
            <Text style={styles.appid}>{d.appId}</Text>
          </View>
        </View>

        <View style={styles.body}>
          <View style={styles.titleRow}>
            <View>
              <Text style={styles.applicant}>{d.applicantName ?? "Unknown Applicant"}</Text>
              <Text style={styles.policyType}>
                Issued {fmtDate(d.createdAt)} · Last updated {fmtDate(d.updatedAt)}
              </Text>
            </View>
            <View style={styles.badgeCol}>
              <Text style={[styles.badge, { color: dc.color, backgroundColor: dc.bg }]}>{dc.label}</Text>
              {d.purchased ? (
                <Text style={[styles.stageBadge, { color: "#ffffff", backgroundColor: "#4f46e5" }]}>
                  ✓ POLICY
                </Text>
              ) : (
                <Text style={[styles.stageBadge, { color: "#475569", backgroundColor: "#e2e8f0" }]}>
                  QUOTE
                </Text>
              )}
            </View>
          </View>

          {decision === "accept" && (
            <View style={styles.premium}>
              <View style={styles.premiumCell}>
                <Text style={styles.premiumLabel}>Monthly Premium</Text>
                <Text style={[styles.premiumValue, { color: "#4f46e5" }]}>{fmtCurrency(d.monthlyPremium)}</Text>
                <Text style={styles.premiumSub}>CAD / month</Text>
              </View>
              <View style={styles.premiumCell}>
                <Text style={styles.premiumLabel}>Annual Premium</Text>
                <Text style={styles.premiumValue}>{fmtCurrency(d.annualPremium)}</Text>
                <Text style={styles.premiumSub}>CAD / year</Text>
              </View>
              <View style={styles.premiumCellLast}>
                <Text style={styles.premiumLabel}>Sum Insured / Coverage</Text>
                <Text style={styles.premiumValue}>{fmtCurrency(d.coverageAmount)}</Text>
                <Text style={styles.premiumSub}>CAD</Text>
              </View>
            </View>
          )}

          {d.reasons.length > 0 && (
            <View style={styles.reasons}>
              <Text style={styles.reasonsTitle}>Underwriting Notes</Text>
              {d.reasons.map((r, i) => (
                <Text style={styles.reasonItem} key={i}>• {r}</Text>
              ))}
            </View>
          )}

          {d.mapImage && (
            <View style={styles.section} wrap={false}>
              <Text style={styles.sectionTitle}>Property Location</Text>
              {/* eslint-disable-next-line jsx-a11y/alt-text */}
              <Image src={d.mapImage} style={styles.mapImage} />
              {d.propertyAddress ? (
                <Text style={styles.mapAddress}>{d.propertyAddress}</Text>
              ) : null}
            </View>
          )}

          {d.sections.map((section) => (
            <View style={styles.section} key={section.title} wrap={false}>
              <Text style={styles.sectionTitle}>{section.title}</Text>
              {section.rows.map((row, i) => (
                <View style={styles.row} key={i}>
                  <Text style={styles.label}>{row.label}</Text>
                  <Text style={styles.value}>{row.value}</Text>
                </View>
              ))}
            </View>
          ))}
        </View>

        <View style={styles.footer} fixed>
          <Text style={styles.footerTitle}>InsureFlow Broker Portal</Text>
          <Text style={styles.footerMuted}>
            This document is a summary of the quote/policy details on record.
          </Text>
          <Text style={styles.footerMuted}>© {new Date().getFullYear()} InsureFlow. All rights reserved.</Text>
        </View>
      </Page>
    </Document>
  );
}

export async function renderPolicyPdf(d: PolicyPdfData): Promise<Buffer> {
  return renderToBuffer(<PolicyPdf d={d} />);
}
