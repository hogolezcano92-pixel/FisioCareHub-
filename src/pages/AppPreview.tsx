import React, { useState, useEffect } from 'react';
import { GoogleGenAI } from "@google/genai";
import { motion } from 'motion/react';
import { Smartphone, RefreshCw, Download, CheckCircle2 } from 'lucide-react';

export default function AppPreview() {
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const generateImage = async () => {
    setLoading(true);
    setError(null);
    
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
          parts: [{ text: prompt }],
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
          setImageUrl(`data:image/png;base64,${part.inlineData.data}`);
          break;
        }
      }
    } catch (err) {
      console.error("Error generating image:", err);
      setError("Falha ao gerar a prévia da imagem. Por favor, tente novamente.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    generateImage();
  }, []);

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-3xl shadow-xl overflow-hidden border border-slate-100">
        <div className="p-6 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-cyan-500 rounded-xl flex items-center justify-center text-white">
              <Smartphone size={24} />
            </div>
            <div>
              <h2 className="font-bold text-slate-800">Prévia do App</h2>
              <p className="text-xs text-slate-500">Interface Mobile Atualizada</p>
            </div>
          </div>
          <button 
            onClick={generateImage}
            disabled={loading}
            className="p-2 hover:bg-slate-100 rounded-full transition-colors disabled:opacity-50"
          >
            <RefreshCw size={20} className={cn("text-slate-600", loading && "animate-spin")} />
          </button>
        </div>

        <div className="relative aspect-[9/16] bg-slate-900 flex items-center justify-center overflow-hidden">
          {loading ? (
            <div className="flex flex-col items-center gap-4 text-white">
              <div className="w-12 h-12 border-4 border-cyan-500 border-t-transparent rounded-full animate-spin"></div>
              <p className="text-sm font-medium animate-pulse">Gerando imagem de alta fidelidade...</p>
            </div>
          ) : imageUrl ? (
            <motion.img 
              initial={{ opacity: 0, scale: 1.1 }}
              animate={{ opacity: 1, scale: 1 }}
              src={imageUrl} 
              alt="FisioCareHub App Preview"
              className="w-full h-full object-cover"
              referrerPolicy="no-referrer"
            />
          ) : error ? (
            <div className="p-8 text-center text-slate-400">
              <p>{error}</p>
            </div>
          ) : null}
        </div>

        <div className="p-6 bg-slate-50">
          <div className="flex items-start gap-3 mb-4">
            <CheckCircle2 className="text-green-500 mt-1 flex-shrink-0" size={18} />
            <p className="text-sm text-slate-600">
              A imagem reflete a nova identidade visual com o logotipo dinâmico e tipografia em azul ciano.
            </p>
          </div>
          
          {imageUrl && (
            <a 
              href={imageUrl} 
              download="fisio-care-hub-preview.png"
              className="w-full py-3 bg-slate-800 text-white rounded-xl font-medium flex items-center justify-center gap-2 hover:bg-slate-700 transition-colors"
            >
              <Download size={18} />
              Baixar Imagem
            </a>
          )}
        </div>
      </div>
      
      <p className="mt-6 text-slate-400 text-xs text-center max-w-xs">
        Esta imagem foi gerada por IA para demonstrar a nova interface do FisioCareHub em um dispositivo móvel.
      </p>
    </div>
  );
}

function cn(...classes: any[]) {
  return classes.filter(Boolean).join(' ');
}
