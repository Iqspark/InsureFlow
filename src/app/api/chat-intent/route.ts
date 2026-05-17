import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import OpenAI from "openai";

interface QuestionSummary {
  id: string;
  label: string;
  currentAnswer: string;
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!process.env.OPENAI_API_KEY || process.env.OPENAI_API_KEY === "your-openai-api-key-here") {
    return NextResponse.json(
      { error: "OPENAI_API_KEY not configured", questionId: null },
      { status: 503 }
    );
  }

  const { message, questions } = (await req.json()) as {
    message: string;
    questions: QuestionSummary[];
  };

  const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

  const questionList = questions
    .map((q) => `ID: ${q.id} | Question: ${q.label} | Current answer: ${q.currentAnswer}`)
    .join("\n");

  const completion = await client.chat.completions.create({
    model: "gpt-4o-mini",
    max_tokens: 150,
    messages: [
      {
        role: "system",
        content:
          "You help users edit their insurance quote answers. Identify which question ID the user wants to change based on their message. Reply ONLY with valid JSON, no markdown: {\"questionId\":\"the_id\",\"reply\":\"one short friendly sentence confirming what you'll take them back to\"}. If unclear: {\"questionId\":null,\"reply\":\"I'm not sure which answer to change — could you be more specific?\"}",
      },
      {
        role: "user",
        content: `User said: "${message}"\n\nQuestions and current answers:\n${questionList}`,
      },
    ],
    response_format: { type: "json_object" },
  });

  const raw = completion.choices[0]?.message?.content ?? "{}";

  try {
    return NextResponse.json(JSON.parse(raw));
  } catch {
    return NextResponse.json({ questionId: null, reply: "Sorry, I couldn't understand that. Could you rephrase?" });
  }
}
