import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const maxDuration = 60;

const ALLOWED_MODELS = ["gemini-3.5-flash", "gemini-3.1-pro-preview", "gemini-3.1-flash-lite"];
const DEFAULT_MODEL = "gemini-3.5-flash";

const LENGTH_GUIDE: Record<string, string> = {
  short: "Short: 50-90 words. Punchy, 3-5 short lines.",
  medium: "Medium: 120-200 words. A clear hook, a story or insight, and a takeaway.",
  long: "Long: 250-380 words. A narrative with structure, concrete details and a strong close.",
};

type GenerateBody = {
  topic?: string;
  tone?: string;
  length?: string;
  profession?: string;
  model?: string;
};

type Post = {
  angle: string;
  hook: string;
  body: string;
  hashtags: string[];
};

const responseSchema = {
  type: "OBJECT",
  properties: {
    posts: {
      type: "ARRAY",
      items: {
        type: "OBJECT",
        properties: {
          angle: { type: "STRING", description: "2-4 word label for the creative angle, e.g. 'Personal story'" },
          hook: { type: "STRING", description: "The opening line of the post, written to stop the scroll" },
          body: { type: "STRING", description: "The rest of the post after the hook, with line breaks (\\n) between short paragraphs" },
          hashtags: { type: "ARRAY", items: { type: "STRING" }, description: "3-5 relevant hashtags without the # symbol" },
        },
        required: ["angle", "hook", "body", "hashtags"],
      },
    },
  },
  required: ["posts"],
};

function buildPrompt({ topic, tone, length, profession }: Required<Omit<GenerateBody, "model">>) {
  return `You are a top LinkedIn ghostwriter who writes posts that earn real engagement without sounding like AI.

Write exactly 3 distinct LinkedIn post options.

Author's profession: ${profession}
Topic: ${topic}
Tone: ${tone}
Length: ${LENGTH_GUIDE[length] ?? LENGTH_GUIDE.medium}

Rules:
- Each option takes a clearly different angle (e.g. personal story, contrarian take, practical list, lesson learned, question to the audience).
- Write in first person from the point of view of the author's profession.
- The hook is one line that makes people click "see more". No clichés like "I'm excited to announce" or "In today's fast-paced world".
- Use short paragraphs separated by line breaks. Emojis only if they fit the tone, and sparingly.
- End with a takeaway or a question that invites comments.
- Do not put hashtags in the body; return them separately.`;
}

export async function POST(req: Request) {
  const apiKey = req.headers.get("x-gemini-key")?.trim();
  if (!apiKey) {
    return NextResponse.json({ error: "Add your Gemini API key to generate posts." }, { status: 401 });
  }

  let body: GenerateBody;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const topic = body.topic?.trim().slice(0, 1000);
  const profession = body.profession?.trim().slice(0, 120) || "professional";
  const tone = body.tone?.trim().slice(0, 60) || "Professional";
  const length = body.length && LENGTH_GUIDE[body.length] ? body.length : "medium";
  const model = body.model && ALLOWED_MODELS.includes(body.model) ? body.model : DEFAULT_MODEL;

  if (!topic) {
    return NextResponse.json({ error: "Tell me what the post is about." }, { status: 400 });
  }

  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-goog-api-key": apiKey },
      body: JSON.stringify({
        contents: [{ role: "user", parts: [{ text: buildPrompt({ topic, tone, length, profession }) }] }],
        generationConfig: {
          temperature: 1,
          responseMimeType: "application/json",
          responseSchema,
        },
      }),
    }
  );

  const data = await res.json().catch(() => null);

  if (!res.ok) {
    const message: string = data?.error?.message ?? `Gemini returned an error (${res.status}).`;
    const friendly = /api key/i.test(message)
      ? "That API key was rejected by Gemini. Double-check it in Google AI Studio."
      : message;
    return NextResponse.json({ error: friendly }, { status: res.status });
  }

  const text: string | undefined = data?.candidates?.[0]?.content?.parts
    ?.map((p: { text?: string }) => p.text ?? "")
    .join("");

  if (!text) {
    const reason = data?.promptFeedback?.blockReason ?? data?.candidates?.[0]?.finishReason;
    return NextResponse.json(
      { error: reason ? `Gemini didn't return posts (${reason}). Try rephrasing the topic.` : "Gemini returned an empty response." },
      { status: 502 }
    );
  }

  try {
    const parsed = JSON.parse(text) as { posts: Post[] };
    const posts = (parsed.posts ?? []).slice(0, 3).map((p) => ({
      angle: p.angle,
      hook: p.hook,
      body: p.body,
      hashtags: (p.hashtags ?? []).map((h) => h.replace(/^#/, "").replace(/\s+/g, "")),
    }));
    return NextResponse.json({ posts, model });
  } catch {
    return NextResponse.json({ error: "Couldn't read Gemini's response. Please try again." }, { status: 502 });
  }
}
