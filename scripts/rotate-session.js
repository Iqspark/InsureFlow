// Runs before `npm run dev`. Writes a new SESSION_VERSION to .env.local so
// that any JWT cookies from a previous server run are immediately rejected.
const fs = require("fs");
const path = require("path");

const envLocalPath = path.join(__dirname, "..", ".env.local");

let existing = fs.existsSync(envLocalPath)
  ? fs.readFileSync(envLocalPath, "utf8")
  : "";

// Remove any existing SESSION_VERSION line
existing = existing
  .split("\n")
  .filter((line) => !line.startsWith("SESSION_VERSION="))
  .join("\n")
  .trim();

const version = Date.now().toString();
const newContent = (existing ? existing + "\n" : "") + `SESSION_VERSION=${version}\n`;

fs.writeFileSync(envLocalPath, newContent);
console.log(`[rotate-session] SESSION_VERSION=${version}`);
