import { GoogleGenAI, Type } from "@google/genai";

// Note: API key should be set via environment or edge function
const GEMINI_API_KEY = '';
const ai = new GoogleGenAI({ apiKey: GEMINI_API_KEY });

export const generateAgentSummary = async (userData: string) => {
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `Based on this user data: ${userData}, generate a concise summary of what GIA has learned about their priorities and business. Format as JSON with fields: 'aboutYou', 'aboutBusiness', 'priorities'.`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            aboutYou: { type: Type.STRING },
            aboutBusiness: { type: Type.STRING },
            priorities: { type: Type.ARRAY, items: { type: Type.STRING } }
          },
          required: ['aboutYou', 'aboutBusiness', 'priorities']
        }
      }
    });
    // Accessing .text property directly as it returns the string
    return JSON.parse(response.text);
  } catch (error) {
    console.error("Gemini Error:", error);
    return null;
  }
};

export const chatWithAgent = async (history: any[], message: string) => {
  const chat = ai.chats.create({
    model: 'gemini-3-flash-preview',
    config: {
      systemInstruction: "You are GIA, the General Intelligence Agency agent. You are proactive, concise, and professional. You help founders and creators manage tasks, decisions, and files. Avoid jargon. Always suggest the next step."
    }
  });
  
  // Note: Simplification for demonstration. Real history should be formatted correctly.
  const result = await chat.sendMessage({ message });
  // Accessing .text property directly
  return result.text;
};
