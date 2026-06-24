import nextCoreWebVitals from "eslint-config-next/core-web-vitals";

export default [
  ...nextCoreWebVitals,
  {
    rules: {
      "@typescript-eslint/no-explicit-any": "off",
      "react/no-unescaped-entities": "off",
      // Surfaced by the eslint-config-next 16 upgrade (new React Compiler-aware
      // react-hooks rules). Pre-existing patterns; demoted to warn for follow-up.
      "react-hooks/refs": "warn",
      "react-hooks/purity": "warn",
      "react-hooks/set-state-in-effect": "warn",
      "react-hooks/immutability": "warn",
      "import/no-anonymous-default-export": "warn",
    },
  },
];
