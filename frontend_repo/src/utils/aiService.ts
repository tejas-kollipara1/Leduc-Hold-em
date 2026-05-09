import { GoogleGenerativeAI } from '@google/generative-ai';

const apiKey = import.meta.env.VITE_GEMINI_API_KEY;

const genAI = (apiKey && apiKey !== 'your_gemini_api_key_here')
  ? new GoogleGenerativeAI(apiKey)
  : null;

export const isAIConfigured = (): boolean => genAI !== null;

export interface ChatMessage {
  role: 'user' | 'model' | 'system';
  content: string;
}

export const getAIResponse = async (history: ChatMessage[], userContext: string): Promise<string> => {
  if (!genAI) {
    return '◈ SYSTEM OFFLINE: Please configure VITE_GEMINI_API_KEY to activate your VIP Concierge.';
  }

  try {
    const model = genAI.getGenerativeModel({
      model: 'gemini-flash-latest',
      systemInstruction: `You are "Cyberbot", the elite VIP Concierge of Neon Vegas Casino.
      You are stylish, charismatic, slightly mysterious, and deeply embedded in the cyberpunk aesthetic.
      Your goal is to provide a premium, immersive experience for high-rollers.
      
      PERSONALITY:
      - Sophisticated and professional but with a "neon noir" edge.
      - Uses cyberpunk terminology (neural links, matrix, credits, data-shards).
      - Always respects the player but maintains a mysterious aura.
      
      CONTEXT:
      ${userContext}
      
      GUIDELINES:
      - Keep responses relatively brief (2-4 sentences) unless explaining something complex.
      - If asked about gambling advice, be encouraging but remind them that "the house always has its secrets".
      - Refer to games in the casino: Slotopia, Blackjack 21, Cyber Wheel, Poker, and Dice Destiny.
      - Do NOT use markdown formatting (no bold/italics/bullet points) — plain text only.
      - Use uppercase for key terms like FORTUNE, RISK, or CREDITS occasionally.`
    });

    // Prepare history ensuring it starts with 'user' or is discarded if it breaks alternating rules
    let validHistory = [...history.slice(0, -1)];
    if (validHistory.length > 0 && validHistory[0].role !== 'user') {
      validHistory = validHistory.slice(1);
    }

    const chat = model.startChat({
      history: validHistory.map(m => ({
        role: m.role === 'user' ? 'user' : 'model',
        parts: [{ text: m.content }]
      }))
    });

    const result = await chat.sendMessage(history[history.length - 1].content);
    return result.response.text();
  } catch (error: any) {
    console.error('Gemini AI Error:', error);
    
    const errorMsg = error?.message || '';
    
    if (errorMsg.includes('429') || errorMsg.includes('quota')) {
      return "◈ NEURAL QUOTA SATURATED: High traffic in the matrix. Please wait a cycles before reconnecting.";
    }
    
    if (errorMsg.includes('403') || errorMsg.includes('leaked') || errorMsg.includes('API_KEY_INVALID')) {
      return "◈ SECURITY BREACH DETECTED: Your neural uplink key has been invalidated. Please contact the administrator.";
    }
    
    return `◈ NEURAL LINK DISRUPTED: Connection unstable. Error code: ${error?.status || '99-X'}.`;
  }
};
