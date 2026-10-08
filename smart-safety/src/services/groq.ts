import Groq from "groq-sdk";
import { GROQ_API_KEY, GROQ_MODEL } from "../config";

export type GroqRecommendation = {
  text: string;
  confidence?: number;
}

const DEFAULT_TIMEOUT = 10000;

async function timeoutPromise<T>(p: Promise<T>, ms: number): Promise<T> {
  let id: NodeJS.Timeout;
  const timeout = new Promise<never>((_, rej) => {
    id = setTimeout(() => rej(new Error('timeout')), ms);
  });
  const res = await Promise.race([p, timeout]);
  clearTimeout(id!);
  return res as T;
}

export async function fetchGroqRecommendations(context: string, limit = 5): Promise<GroqRecommendation[]> {
  console.log('Groq: Starting recommendation fetch...');

  if (!GROQ_API_KEY) {
    console.warn('Groq: API key not configured, using fallback recommendations');
    return [
      { text: "Avoid carrying valuables openly in crowded areas." },
      { text: "Stay with your group after dark." },
      { text: "Keep emergency contacts pinned." },
    ];
  }

  console.log('Groq: API configured, preparing request...');

  try {
    console.log('Groq: Sending request to API...');

    const groq = new Groq({ apiKey: GROQ_API_KEY });

    const prompt = `You are a concise safety assistant. Given the following context about a user's situation, provide ${limit} brief safety recommendations as a JSON array of objects with "text" and optional "confidence" (0-1) fields.

Context: ${context}

Respond with valid JSON only. No markdown formatting, no code blocks, no additional text. Just the JSON array.`;

    const result = await timeoutPromise(
      groq.chat.completions.create({
        messages: [
          {
            role: "system",
            content: "You are a safety expert. Respond only with valid JSON arrays. No markdown, no code blocks.",
          },
          {
            role: "user",
            content: prompt,
          },
        ],
        model: GROQ_MODEL,
        temperature: 0.2,
        max_tokens: 512,
      }),
      DEFAULT_TIMEOUT
    );

    console.log('Groq: API response received, parsing...');
    const text = result.choices[0]?.message?.content || "";
    console.log('Groq: Raw API response:', text);

    try {
      let jsonText = text;

      if (text.includes('```json')) {
        console.log('Groq: Detected markdown code block, extracting JSON...');
        const jsonMatch = text.match(/```json\s*([\s\S]*?)\s*```/);
        if (jsonMatch) {
          jsonText = jsonMatch[1].trim();
          console.log('Groq: Extracted JSON from code block:', jsonText);
        }
      } else if (text.includes('```')) {
        console.log('Groq: Detected generic code block, extracting content...');
        const codeMatch = text.match(/```\s*([\s\S]*?)\s*```/);
        if (codeMatch) {
          jsonText = codeMatch[1].trim();
          console.log('Groq: Extracted content from code block:', jsonText);
        }
      }

      const parsed = JSON.parse(jsonText);
      if (Array.isArray(parsed)) {
        console.log('Groq: Successfully parsed recommendations:', parsed.slice(0, limit));
        return parsed.slice(0, limit).map((item: any) => ({
          text: item.text || item.recommendation || item.advice || String(item),
          confidence: item.confidence,
        }));
      }
    } catch (parseError) {
      console.warn('Groq: JSON parsing failed:', parseError);
      console.log('Groq: Raw text that failed to parse:', text);

      const jsonMatch = String(text).match(/\[\s*\{[\s\S]*\}\s*\]/);
      if (jsonMatch) {
        try {
          const parsed = JSON.parse(jsonMatch[0]);
          if (Array.isArray(parsed)) {
            console.log('Groq: Successfully parsed recommendations via regex:', parsed.slice(0, limit));
            return parsed.slice(0, limit).map((item: any) => ({
              text: item.text || item.recommendation || item.advice || String(item),
              confidence: item.confidence,
            }));
          }
        } catch { /* ignore */ }
      }
      console.warn('Groq: Regex extraction failed, falling back to line splitting...');
      const recommendations = String(text).split('\n').filter(Boolean).slice(0, limit).map((t: string) => ({ text: t.trim() }));
      console.log('Groq: Fallback recommendations:', recommendations);
      return recommendations;
    }

    console.warn('Groq: All parsing methods failed, using static fallback');
    return [
      { text: "Avoid carrying valuables openly in crowded areas." },
      { text: "Stay with your group after dark." },
      { text: "Keep emergency contacts pinned." },
    ];
  } catch (err) {
    console.error('Groq: Request failed:', err);
    if (context.includes('weather') || context.includes('temperature')) {
      return [
        { text: "Stay hydrated and monitor weather conditions." },
        { text: "Be prepared for sudden weather changes." },
        { text: "Keep emergency supplies handy." },
      ];
    } else if (context.includes('location') || context.includes('area')) {
      return [
        { text: "Stay aware of your surroundings." },
        { text: "Keep valuables secure and out of sight." },
        { text: "Travel with companions when possible." },
      ];
    } else {
      return [
        { text: "Stay aware of your surroundings." },
        { text: "Keep emergency contacts accessible." },
        { text: "Trust your instincts and avoid risky situations." },
      ];
    }
  }
}

export default { fetchGroqRecommendations };
