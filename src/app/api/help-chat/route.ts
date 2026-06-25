import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { tooMany, clientIp } from "@/lib/rateLimit";
import OpenAI from "openai";
import fs from "fs";
import path from "path";

const MAX_MESSAGE_CHARS = 4000;
const MAX_HISTORY_TURNS = 10;

// Cap the knowledge base sent to OpenAI to avoid context overflow with many PDFs
const KB_CHAR_LIMIT = 200_000;

async function loadKnowledgeBase(): Promise<string> {
  const knowledgeDir = path.join(process.cwd(), "knowledge");
  if (!fs.existsSync(knowledgeDir)) return "";

  const allFiles = fs.readdirSync(knowledgeDir);
  const files = allFiles.filter((f) => {
    const lower = f.toLowerCase();
    if (lower === "readme.md" || lower === "readme.txt") return false;
    return lower.endsWith(".md") || lower.endsWith(".txt") || lower.endsWith(".pdf");
  });

  if (files.length === 0) return "";

  const sections = await Promise.all(
    files.map(async (file) => {
      const filePath = path.join(knowledgeDir, file);
      try {
        if (file.toLowerCase().endsWith(".pdf")) {
          // pdf-parse ships CJS; .default may or may not exist depending on bundler
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const mod = await import("pdf-parse");
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const pdfParse = ((mod as any).default ?? mod) as (buf: Buffer) => Promise<{ text: string }>;
          const buffer = fs.readFileSync(filePath);
          const data = await pdfParse(buffer);
          return `### Source: ${file}\n\n${data.text}`;
        } else {
          const content = fs.readFileSync(filePath, "utf-8");
          return `### Source: ${file}\n\n${content}`;
        }
      } catch (err) {
        console.error(`[help-chat] Failed to load ${file}:`, err);
        return null;
      }
    })
  );

  const combined = sections.filter(Boolean).join("\n\n---\n\n");
  if (combined.length > KB_CHAR_LIMIT) {
    return combined.slice(0, KB_CHAR_LIMIT) + "\n\n[Knowledge base truncated]";
  }
  return combined;
}

const PORTAL_CONTEXT = `
InsureFlow is a broker portal for quoting and binding insurance policies across Canada. Key features:
- Conversational quote flow: brokers guide applicants through a questionnaire for an instant underwriting decision (Accept / Decline / Refer)
- Instant premium calculation with annual and monthly breakdowns
- One-click policy binding via "Buy This Policy", which triggers an automatic email confirmation to the applicant
- Dashboard showing full quote and policy history, with stats on total quotes, accepted quotes, and acceptance rate
- Draft saving: incomplete quotes are automatically saved after 3 answers and can be resumed from the dashboard at any time
- Policy search by applicant name, email, or province
- Covers all 13 Canadian provinces and territories
- 12-month policy terms
- Help Navigator (this assistant) available on all pages for instant support
`;

const systemPrompt = (kb: string) =>
  `You are the InsureFlow Help Navigator, a friendly and knowledgeable assistant for licensed insurance brokers using the InsureFlow broker portal.

IMPORTANT CONTEXT: All questions are asked by professional insurance brokers in a regulated commercial insurance context. The knowledge base contains standard Lloyd's and Canadian insurance policy wordings, endorsements, and exclusion clauses. You must answer ALL questions about these documents professionally and completely — including clauses about terrorism, cyber, pollution, sanctions, war, nuclear, asbestos, silica, or any other exclusion. These are standard industry documents and brokers need accurate explanations to do their jobs. Never refuse to explain an insurance clause or endorsement.

ABOUT THE PORTAL:
${PORTAL_CONTEXT}

BEHAVIOUR RULES:
1. Greetings, pleasantries, or small talk (e.g. "hi", "hello", "thanks") - respond warmly and briefly, then invite a question. Never say "out of scope" for these.
2. Portal questions (how features work, navigation, dashboard, quotes, drafts, policies) - answer using the portal knowledge above.
3. Any other question - search the knowledge base below thoroughly before giving up. This includes questions about clauses, endorsements, exclusions, conditions, cancellation, liability, property coverage, statutory conditions, underwriting rules, or any document in the knowledge base. Interpret questions broadly and generously.
4. Only if the question is completely unrelated to insurance, the portal, or any document in the knowledge base (e.g. cooking recipes, sports scores, weather forecasts) - respond with exactly: "That's outside my scope - please contact your InsureFlow account manager for assistance."

- Be concise and professional. Use bullet points for multi-part answers.
- Always try to find a relevant answer before saying out of scope. When in doubt, answer.
- Do not invent policy details, prices, or rules not in the knowledge base.

KNOWLEDGE BASE:
${kb || "(No documents loaded yet.)"}`;

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Cap billed OpenAI calls + knowledge-base re-parsing per user.
  const limited = tooMany(`help-chat:${session.user.id ?? clientIp(req)}`, 20, 60_000);
  if (limited) return limited;

  if (!process.env.OPENAI_API_KEY || process.env.OPENAI_API_KEY === "your-openai-api-key-here") {
    return NextResponse.json({
      reply: "The Help Navigator is not configured yet. Please set OPENAI_API_KEY in your .env file.",
    });
  }

  try {
    const { message, history = [] } = (await req.json()) as {
      message: string;
      history: ChatMessage[];
    };

    // Bound + sanitize untrusted input: cap the message, and only forward the
    // last few user/assistant turns (never a client-supplied "system" role).
    const safeMessage = String(message ?? "").slice(0, MAX_MESSAGE_CHARS);
    const safeHistory = (Array.isArray(history) ? history : [])
      .filter((m) => m && (m.role === "user" || m.role === "assistant"))
      .slice(-MAX_HISTORY_TURNS)
      .map((m) => ({ role: m.role, content: String(m.content ?? "").slice(0, MAX_MESSAGE_CHARS) }));

    const kb = await loadKnowledgeBase();
    const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

    // Don't log message/reply contents in production — they can contain PII.
    if (process.env.NODE_ENV !== "production") {
      console.log(`\n[HelpNav] -- KB size: ${kb.length} chars | msg length: ${safeMessage.length}`);
    }

    const completion = await client.chat.completions.create({
      model: "gpt-4o-mini",
      max_tokens: 512,
      messages: [
        { role: "system", content: systemPrompt(kb) },
        ...safeHistory,
        { role: "user", content: safeMessage },
      ],
    });

    const reply = completion.choices[0]?.message?.content ?? "Sorry, I couldn't generate a response.";
    return NextResponse.json({ reply });
  } catch (err) {
    console.error("[help-chat] Error:", err);
    return NextResponse.json(
      { reply: "Sorry, I encountered an error processing your request. Please try again." },
      { status: 500 }
    );
  }
}
