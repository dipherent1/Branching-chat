import { streamText } from "ai";
import { createGoogleGenerativeAI } from "@ai-sdk/google";

export const maxDuration = 60;

// Set to true to use mock responses (lorem ipsum) instead of real AI
const USE_MOCK = false;

export async function POST(req: Request) {
  try {
    const { messages, model: modelName, apiProvider } = await req.json();
    const geminiApiKey = req.headers.get("x-gemini-api-key");

    // Debug logs: do not log the actual API key
    console.log("[v0] /api/chat received request", {
      apiProvider,
      modelName,
      geminiApiKeyProvided: !!geminiApiKey,
      messagesCount: Array.isArray(messages) ? messages.length : 0,
    });

    // Mock mode - return lorem ipsum generator
    if (USE_MOCK) {
      return createMockStreamResponse(messages);
    }

    // Real AI mode
    // Determine which model/provider to use
    let model: Parameters<typeof streamText>[0]["model"];
    let usedProvider = "gateway";

    if (apiProvider === "gemini" && geminiApiKey) {
      // User-provided Gemini API key -> direct Google provider
      usedProvider = "gemini";
      console.log("[v0] Using direct Google provider (Gemini) path");
      const google = createGoogleGenerativeAI({ apiKey: geminiApiKey });
      // Strip "google/" prefix if present since the Google provider adds it
      const cleanModel =
        modelName?.replace(/^google\//, "") || "gemini-2.5-flash";
      console.log("[v0] Google model chosen:", cleanModel);
      model = google(cleanModel);
    } else {
      // Default: Vercel AI Gateway (pass model string directly)
      usedProvider = "gateway";
      console.log("[v0] Using Vercel AI Gateway path");
      model = modelName || "google/gemini-2.5-flash";
      console.log("[v0] Gateway model string:", model);
    }

    const result = streamText({
      model,
      messages: messages.map((msg: { role: string; content: string }) => ({
        role: msg.role as "user" | "assistant" | "system",
        content: msg.content,
      })),
      abortSignal: req.signal,
    });

    // Attach a debug header to the streaming response so the client can see which provider was used
    const response = result.toTextStreamResponse();

    return response;
  } catch (error) {
    console.error("Chat error:", error);
    return new Response(JSON.stringify({ error: "Error processing request" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}

// Mock response generator - mimics streaming text response
function createMockStreamResponse(
  messages: Array<{ role: string; content: string }>,
) {
  console.log(
    "[v0] Mock API received messages:",
    messages.map((m) => ({
      role: m.role,
      contentPreview: m.content.slice(0, 50),
    })),
  );

  const loremWords = [
    "lorem",
    "ipsum",
    "dolor",
    "sit",
    "amet",
    "consectetur",
    "adipiscing",
    "elit",
    "sed",
    "do",
    "eiusmod",
    "tempor",
    "incididunt",
    "ut",
    "labore",
    "et",
    "dolore",
    "magna",
    "aliqua",
    "enim",
    "ad",
    "minim",
    "veniam",
    "quis",
    "nostrud",
    "exercitation",
    "ullamco",
    "laboris",
    "nisi",
    "aliquip",
    "ex",
    "ea",
    "commodo",
    "consequat",
    "duis",
    "aute",
    "irure",
    "in",
    "reprehenderit",
    "voluptate",
    "velit",
    "esse",
    "cillum",
    "fugiat",
    "nulla",
    "pariatur",
    "excepteur",
    "sint",
    "occaecat",
    "cupidatat",
    "non",
    "proident",
    "sunt",
    "culpa",
    "qui",
    "officia",
    "deserunt",
    "mollit",
    "anim",
    "id",
    "est",
    "laborum",
  ];

  // Generate 3-5 sentences
  const numSentences = 3 + Math.floor(Math.random() * 3);
  let text = "";

  for (let i = 0; i < numSentences; i++) {
    const sentenceLength = 8 + Math.floor(Math.random() * 12);
    const words: string[] = [];

    for (let j = 0; j < sentenceLength; j++) {
      const word = loremWords[Math.floor(Math.random() * loremWords.length)];
      words.push(j === 0 ? word.charAt(0).toUpperCase() + word.slice(1) : word);
    }

    text += words.join(" ") + ". ";
  }

  // Create a readable stream that emits text chunk by chunk
  const encoder = new TextEncoder();
  const words = text.split(" ");

  const stream = new ReadableStream({
    async start(controller) {
      for (const word of words) {
        // Simulate streaming delay
        await new Promise((resolve) =>
          setTimeout(resolve, 30 + Math.random() * 70),
        );
        controller.enqueue(encoder.encode(word + " "));
      }
      controller.close();
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "no-cache",
    },
  });
}
