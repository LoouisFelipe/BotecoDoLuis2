import { GoogleGenAI } from "@google/genai";

// Initialize the Gemini API client
// Note: process.env.GEMINI_API_KEY is automatically injected by AI Studio
// if configured in the Secrets panel.
const genAI = new GoogleGenAI({ 
  apiKey: process.env.GEMINI_API_KEY || "" 
});

export const geminiService = {
  /**
   * Generates a response from Gemini based on a prompt.
   */
  async generateResponse(prompt: string, systemInstruction?: string) {
    try {
      if (!process.env.GEMINI_API_KEY) {
        throw new Error("GEMINI_API_KEY não configurada. Por favor, adicione-a nos Ajustes do AI Studio.");
      }

      const response = await genAI.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: prompt,
        config: {
          systemInstruction: systemInstruction || "Você é um assistente especializado em gestão de bares e botecos. Ajude o Luis a gerenciar o Boteco do Luis com dicas de estoque, finanças e atendimento.",
        },
      });

      return response.text;
    } catch (error) {
      console.error("Erro ao chamar Gemini API:", error);
      throw error;
    }
  },

  /**
   * Analyzes bar data to provide insights.
   */
  async analyzeData(data: any, type: 'inventory' | 'finances' | 'general') {
    const prompt = `Analise os seguintes dados de ${type} do Boteco do Luis e forneça 3 insights estratégicos curtos:\n${JSON.stringify(data)}`;
    return this.generateResponse(prompt);
  }
};
