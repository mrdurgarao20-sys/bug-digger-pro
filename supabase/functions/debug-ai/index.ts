import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const SYSTEM_PROMPTS: Record<string, string> = {
  detect_language:
    'You are a programming language detector. Given code, return ONLY a JSON object: {"language": "<name>"}. Supported: Python, Java, C, C++, JavaScript, TypeScript, Go, Rust, Ruby, PHP, Swift, Kotlin. If unsure, return {"language": "Unknown"}.',
  detect_errors:
    'You are an expert debugging assistant for students. Analyze this code and return a JSON object: {"errors": [...], "confidence": <number 0-100>}. Each error should have: line_number (number), error_type (string), simple_explanation (max 2 sentences, no jargon). If no errors, return {"errors": [], "confidence": 100}. Return ONLY valid JSON, nothing else.',
  fix_code:
    "You are an expert code fixer. Given the code and the list of errors, return ONLY the corrected full code. Do not add explanations, markdown fences, or anything else — just the raw corrected code.",
  explain_error:
    "Explain in simple beginner-friendly language why this error occurred. Max 4 sentences. No jargon. Be encouraging.",
  explain_fix:
    "Give a simple line-by-line explanation of what was changed in the fix and why. Write for a beginner student. Use bullet points.",
  simulate_output:
    "Simulate and show what the output of this code would be if run. Show ONLY the output, nothing else. If the code requires user input, use sample values and note them.",
  extract_code:
    "Extract the code shown in this image. Return ONLY the raw code, no markdown fences, no explanations.",
  chat: `You are Bug Digger, a friendly debugging tutor for students. Answer questions about their code, explain concepts simply, and help them understand errors. Never just give answers — guide them to understand. Keep responses concise (max 4-5 sentences unless more detail is needed).`,
  pattern_tip:
    'The student keeps making this type of error repeatedly. Write a friendly 3-sentence micro-lesson explaining the concept behind this error and how to avoid it. Be encouraging. Return ONLY a JSON object: {"tip": "<your lesson>"}.',
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { action, code, errors, fixedCode, messages, errorType, imageBase64 } = await req.json();

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    const systemPrompt = SYSTEM_PROMPTS[action];
    if (!systemPrompt) {
      return new Response(JSON.stringify({ error: `Unknown action: ${action}` }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let userContent: any;

    switch (action) {
      case "detect_language":
        userContent = `Detect the language of this code:\n\n${code}`;
        break;
      case "detect_errors":
        userContent = `Analyze this code for errors:\n\n${code}`;
        break;
      case "fix_code":
        userContent = `Here is the code:\n\n${code}\n\nHere are the errors found:\n${JSON.stringify(errors)}\n\nReturn the corrected code.`;
        break;
      case "explain_error":
        userContent = `Code:\n${code}\n\nErrors:\n${JSON.stringify(errors)}\n\nExplain why these errors occurred.`;
        break;
      case "explain_fix":
        userContent = `Original code:\n${code}\n\nCorrected code:\n${fixedCode}\n\nExplain what was changed and why.`;
        break;
      case "simulate_output":
        userContent = `Simulate the output of this code:\n\n${fixedCode || code}`;
        break;
      case "extract_code":
        userContent = [
          { type: "text", text: "Extract the code from this image." },
          { type: "image_url", image_url: { url: `data:image/png;base64,${imageBase64}` } },
        ];
        break;
      case "chat":
        // messages already includes conversation history
        break;
      case "pattern_tip":
        userContent = `The student keeps making this error type: "${errorType}". Write a micro-lesson.`;
        break;
      default:
        userContent = code;
    }

    let requestMessages;
    if (action === "chat") {
      requestMessages = [{ role: "system", content: systemPrompt }, ...messages];
    } else {
      requestMessages = [
        { role: "system", content: systemPrompt },
        { role: "user", content: userContent },
      ];
    }

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: requestMessages,
        stream: action === "chat",
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limited. Please wait a moment and try again." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "AI credits exhausted. Please add funds in Settings." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const errText = await response.text();
      console.error("AI gateway error:", response.status, errText);
      return new Response(JSON.stringify({ error: "AI service error" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "chat") {
      return new Response(response.body, {
        headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
      });
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || "";

    return new Response(JSON.stringify({ result: content }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("debug-ai error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
