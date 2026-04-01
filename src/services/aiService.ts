
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || '' });

export async function auditSecurity(config: string) {
  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: `Analyze the following cybersecurity configuration and provide a professional security audit. 
    Focus on encryption strength, potential vulnerabilities, and best practices. 
    Keep it concise and professional.
    
    Configuration: ${config}`,
    config: {
      systemInstruction: "You are a senior cybersecurity auditor at a top-tier security firm. Provide technical, professional, and actionable advice."
    }
  });
  return response.text;
}

export async function analyzePassword(password: string) {
  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: `Analyze the strength of this password: "${password}". 
    Provide a security score (0-100) and specific technical recommendations to improve it. 
    Do not repeat the password in your response.`,
    config: {
      systemInstruction: "You are a password security expert. Provide a technical score and brief improvement tips."
    }
  });
  return response.text;
}
