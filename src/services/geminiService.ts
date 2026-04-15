import { GoogleGenAI, ThinkingLevel, Type } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

export const geminiService = {
  /**
   * Fast task using gemini-3.1-flash-lite-preview
   */
  async fastTask(prompt: string, systemInstruction?: string) {
    const response = await ai.models.generateContent({
      model: "gemini-3.1-flash-lite-preview",
      contents: prompt,
      config: {
        systemInstruction: systemInstruction || "Você é um assistente rápido para tarefas simples.",
      },
    });
    return response.text;
  },

  /**
   * General task using gemini-3-flash-preview
   */
  async generalTask(prompt: string, systemInstruction?: string) {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: prompt,
      config: {
        systemInstruction: systemInstruction || "Você é um assistente inteligente para tarefas gerais.",
      },
    });
    return response.text;
  },

  /**
   * Task with Google Search grounding using gemini-3-flash-preview
   */
  async searchGroundedTask(prompt: string, systemInstruction?: string) {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: prompt,
      config: {
        tools: [{ googleSearch: {} }],
        systemInstruction: systemInstruction || "Você é um assistente que utiliza dados da pesquisa Google para fornecer informações atualizadas.",
      },
    });
    return response.text;
  },

  /**
   * Complex task using gemini-3.1-pro-preview
   */
  async complexTask(prompt: string, systemInstruction?: string) {
    const response = await ai.models.generateContent({
      model: "gemini-3.1-pro-preview",
      contents: prompt,
      config: {
        systemInstruction: systemInstruction || "Você é um assistente avançado para tarefas complexas.",
      },
    });
    return response.text;
  },

  /**
   * High Thinking task using gemini-3.1-pro-preview
   */
  async highThinkingTask(prompt: string, systemInstruction?: string) {
    const response = await ai.models.generateContent({
      model: "gemini-3.1-pro-preview",
      contents: prompt,
      config: {
        thinkingConfig: { thinkingLevel: ThinkingLevel.HIGH },
        systemInstruction: systemInstruction || "Você é um assistente de alta performance capaz de lidar com as consultas mais complexas dos usuários através de um raciocínio profundo.",
      },
    });
    return response.text;
  },

  /**
   * Legacy method for compatibility if needed, using generalTask
   */
  async generateResponse(prompt: string, systemInstruction?: string) {
    return this.generalTask(prompt, systemInstruction);
  }
};
