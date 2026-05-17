import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import OpenAI from "openai";
import fs from "fs";
import path from "path";

// Cap the knowledge base sent to OpenAI to avoid context overflow with many PDFs
const KB_CHAR_LIMIT = 80_000;

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
          // Dynamic import avoids top-level module init issues with pdf-parse
          const { default: pdfParse } = await import("pdf-parse");
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

const systemPrompt = (kb: string) =>
  `You are the InsureFlow Help Navigator, a friendly assistant for brokers using the InsureFlow vacant home insurance portal.

Behaviour rules:
1. Greetings, pleasantries, or small talk (e.g. "hi", "hello", "thanks", "how are you") — respond warmly and briefly, then invite the broker to ask an insurance question. Never say "out of scope" for these.
2. Insurance questions — use the knowledge base below. Interpret questions broadly; "what's insurance" means "what is vacant home insurance" in this context. Always try to answer from the knowledge base before giving up.
3. Truly unrelated topics (e.g. cooking, sports, technology unrelated to this portal) — respond with exactly: "That's outside my scope — please contact your InsureFlow account manager for assistance."
- Be concise and professional. Use bullet points for multi-part answers.
- Do not invent policy details, prices, or rules not in the knowledge base.

KNOWLEDGE BASE:
${kb || "(No documents loaded yet.)"}`;

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

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

    const kb = await loadKnowledgeBase();
    const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

    console.log(`\n[HelpNav] ── User: ${message}`);

    const completion = await client.chat.completions.create({
      model: "gpt-4o-mini",
      max_tokens: 512,
      messages: [
        { role: "system", content: systemPrompt(kb) },
        ...history.map((m) => ({ role: m.role, content: m.content })),
        { role: "user", content: message },
      ],
    });

    const reply = completion.choices[0]?.message?.content ?? "Sorry, I couldn't generate a response.";
    console.log(`[HelpNav] ── Bot: ${reply}\n`);
    return NextResponse.json({ reply });
  } catch (err) {
    console.error("[help-chat] Error:", err);
    return NextResponse.json(
      { reply: "Sorry, I encountered an error processing your request. Please try again." },
      { status: 500 }
    );
  }
}
