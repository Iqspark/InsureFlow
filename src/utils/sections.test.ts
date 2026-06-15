import { describe, it, expect } from "vitest";
import { orderedSections, sectionForQuestion } from "./sections";
import { QUESTIONS } from "@/data/questions";
import { JEWELLER_QUESTIONS } from "@/data/jewellerQuestions";
import { Question } from "@/types";

describe("sectionForQuestion", () => {
  it("uses summarySection when the question defines it (jeweller)", () => {
    const businessType = JEWELLER_QUESTIONS.find((q) => q.id === "business_type")!;
    expect(sectionForQuestion(businessType)).toBe(businessType.summarySection);
  });

  it("falls back to the vacant-home id→section map", () => {
    const propertyType = QUESTIONS.find((q) => q.id === "property_type")!;
    expect(sectionForQuestion(propertyType)).toBe("Property");
  });

  it("returns 'Details' for an unknown question", () => {
    expect(sectionForQuestion({ id: "unknown_q", type: "text", brokerText: "" } as Question)).toBe(
      "Details"
    );
  });
});

describe("orderedSections", () => {
  it("orders the vacant-home flow starting at 'About You'", () => {
    const sections = orderedSections(QUESTIONS);
    expect(sections[0]).toBe("About You");
    expect(sections).toContain("Loss History");
    expect(sections).toContain("Contact");
  });

  it("orders the jeweller flow starting at 'Business'", () => {
    const sections = orderedSections(JEWELLER_QUESTIONS);
    expect(sections[0]).toBe("Business");
    expect(sections).toContain("Security");
  });

  it("returns each section only once", () => {
    const sections = orderedSections(QUESTIONS);
    expect(new Set(sections).size).toBe(sections.length);
  });
});
