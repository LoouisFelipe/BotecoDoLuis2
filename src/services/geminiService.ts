export const geminiService = {
  /**
   * Internal helper to proxy requests to the secure backend
   */
  async _callBackend(type: string, prompt: string, systemInstruction?: string) {
    try {
      const response = await fetch('/api/gemini', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ type, prompt, systemInstruction }),
      });

      if (!response.ok) {
        throw new Error(`Failed to call AI: ${response.statusText}`);
      }

      const data = await response.json();
      return data.text;
    } catch (error) {
      console.error("Gemini Service Error:", error);
      throw error;
    }
  },

  /**
   * Fast task using gemini-3.1-flash-lite-preview
   */
  async fastTask(prompt: string, systemInstruction?: string) {
    return this._callBackend("fast", prompt, systemInstruction);
  },

  /**
   * General task using gemini-3-flash-preview
   */
  async generalTask(prompt: string, systemInstruction?: string) {
    return this._callBackend("general", prompt, systemInstruction);
  },

  /**
   * Task with Google Search grounding using gemini-3-flash-preview
   */
  async searchGroundedTask(prompt: string, systemInstruction?: string) {
    return this._callBackend("searchGrounded", prompt, systemInstruction);
  },

  /**
   * Complex task using gemini-3.1-pro-preview
   */
  async complexTask(prompt: string, systemInstruction?: string) {
    return this._callBackend("complex", prompt, systemInstruction);
  },

  /**
   * High Thinking task using gemini-3.1-pro-preview
   */
  async highThinkingTask(prompt: string, systemInstruction?: string) {
    return this._callBackend("highThinking", prompt, systemInstruction);
  },

  /**
   * Legacy method for compatibility if needed, using generalTask
   */
  async generateResponse(prompt: string, systemInstruction?: string) {
    return this.generalTask(prompt, systemInstruction);
  }
};
