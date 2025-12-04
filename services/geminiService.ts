import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

export const generateCosmicAnalysis = async (chaos: number, scale: number, userQuery?: string): Promise<string> => {
  try {
    const chaosPct = Math.round(chaos * 100);
    const scalePct = Math.round(scale * 100);

    const contextInstruction = userQuery 
      ? `The user (Starship Captain) asks: "${userQuery}". Answer their specific question based on the telemetry.` 
      : `Describe the visual and physical state of this galaxy in 2 sentences.`;

    const prompt = `
      You are a cosmic observer AI monitoring a galaxy simulation.
      The current simulation parameters are:
      - Entropy/Chaos Level: ${chaosPct}% (0% is ordered, 100% is total molecular scattering)
      - Gravitational Scale: ${scalePct}% (0% is a dense singularity, 100% is a massive expanded nebula)

      ${contextInstruction}
      
      Use scientific yet poetic language suitable for a sci-fi interface. 
      Do not mention "percentages" explicitly, describe the effects.
    `;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: {
        thinkingConfig: { thinkingBudget: 0 } // Fast response needed
      }
    });

    return response.text || "Connection to Deep Space Network lost...";
  } catch (error) {
    console.error("Gemini Error:", error);
    return "ANALYSIS FAILED: Cosmic interference detected.";
  }
};