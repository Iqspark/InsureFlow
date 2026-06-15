import { describe, it, expect } from "vitest";
import { validateEmail, validateName, validatePhone, validateNumber } from "./validate";

describe("validatePhone", () => {
  it("accepts common phone formats", () => {
    expect(validatePhone("4165550142")).toBe("");
    expect(validatePhone("(416) 555-0142")).toBe("");
    expect(validatePhone("+1 416 555 0142")).toBe("");
  });
  it("rejects too-short or invalid input", () => {
    expect(validatePhone("")).not.toBe("");
    expect(validatePhone("123")).not.toBe("");
    expect(validatePhone("not-a-phone")).not.toBe("");
  });
});

describe("validateEmail", () => {
  it("accepts a valid address and rejects others", () => {
    expect(validateEmail("broker@demo.com")).toBe("");
    expect(validateEmail("nope")).not.toBe("");
    expect(validateEmail("")).not.toBe("");
  });
});

describe("validateName", () => {
  it("accepts accented/hyphenated names", () => {
    expect(validateName("Jean-Luc")).toBe("");
    expect(validateName("Renée")).toBe("");
  });
  it("rejects empty, too-short, or non-letter names", () => {
    expect(validateName("")).not.toBe("");
    expect(validateName("A")).not.toBe("");
    expect(validateName("John123")).not.toBe("");
  });
});

describe("validateNumber", () => {
  it("enforces min/max and integer rules", () => {
    expect(validateNumber("5", { min: 1, max: 10 })).toBe("");
    expect(validateNumber("0", { min: 1 })).not.toBe("");
    expect(validateNumber("11", { max: 10 })).not.toBe("");
    expect(validateNumber("1.5", { mustBeInteger: true })).not.toBe("");
    expect(validateNumber("", {})).not.toBe("");
    expect(validateNumber("abc", {})).not.toBe("");
  });
});
