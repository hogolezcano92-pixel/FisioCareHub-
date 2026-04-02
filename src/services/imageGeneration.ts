import { GoogleGenAI } from "@google/genai";

export async function generateAppPreviewImage() {
  const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
  
  const prompt = `A high-resolution, top-down photograph of a modern smartphone screen (iPhone style) displaying a meticulous recreation of a web application user interface. 
  The header is at the top with a pure white (#FFFFFF) background that features a very subtle, elegant repeating pattern of minimalist light cyan medical icons (running person, joint, medical cross, flexed arm, and a small house). 
  The icons in the pattern have a very low opacity (around 5-8%) and are barely visible, creating a professional healthcare texture.
  On the left side of the header, there is a rounded sky blue (#0EA5E9) icon. 
  Inside the icon, there is a white minimalist outline of a house containing a stylized professional healthcare figure (therapist), symbolizing home physiotherapy care. 
  Next to the logo, the text "FisioCareHub" is rendered in a very large, extra-bold sky blue (#0EA5E9) sans-serif font. 
  Directly below the main brand text, the slogan "REABILITAÇÃO E PERFORMANCE" is added in a smaller, lighter-weight sans-serif font, colored a dark gray. 
  On the far right of the header, there is a black hamburger menu icon. 
  Below the header, a dark blue gradient area and content placeholder are present. 
  The screen is clear, with a very professional, premium UI feel. 
  The iOS status bar at the top (time 10:43, signal, and battery) is maintained for fidelity. 
  All text is crisp and perfectly legible.`;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3.1-flash-image-preview',
      contents: {
        parts: [
          {
            text: prompt,
          },
        ],
      },
      config: {
        imageConfig: {
          aspectRatio: "9:16",
          imageSize: "1K"
        },
      },
    });

    for (const part of response.candidates[0].content.parts) {
      if (part.inlineData) {
        return `data:image/png;base64,${part.inlineData.data}`;
      }
    }
  } catch (error) {
    console.error("Error generating image:", error);
    return null;
  }
}
