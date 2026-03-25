import express from "express";
import { createServer as createViteServer } from "vite";
import multer from "multer";
import { GoogleGenAI, Type } from "@google/genai";
import path from "path";
import { fileURLToPath } from "url";
import dotenv from "dotenv";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Configure Multer for memory storage
  const upload = multer({ storage: multer.memoryStorage() });

  // API Routes
  app.post("/api/transcribe", upload.single("audio"), async (req, res) => {
    try {
      const file = req.file;
      const targetLanguage = req.body.targetLanguage || "English";

      if (!file) {
        return res.status(400).json({ error: "No audio file provided" });
      }

      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey) {
        return res.status(500).json({ error: "GEMINI_API_KEY is not configured on the server." });
      }

      const ai = new GoogleGenAI({ apiKey });
      
      const base64Data = file.buffer.toString("base64");

      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: [
          {
            parts: [
              {
                inlineData: {
                  mimeType: file.mimetype || "audio/wav",
                  data: base64Data
                }
              },
              {
                text: `You are an advanced audio transcription and translation engine. 
                1. Detect the primary language.
                2. Transcribe the audio exactly in the original language using its native script (e.g., Urdu script, Arabic script, etc.).
                3. Translate it into ${targetLanguage}.
                
                Respond ONLY in this JSON format:
                {
                  "detected_language": "...",
                  "original_transcript": "...",
                  "target_language": "${targetLanguage}",
                  "translated_transcript": "..."
                }`
              }
            ]
          }
        ],
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              detected_language: { type: Type.STRING },
              original_transcript: { type: Type.STRING },
              target_language: { type: Type.STRING },
              translated_transcript: { type: Type.STRING }
            },
            required: ["detected_language", "original_transcript", "target_language", "translated_transcript"]
          }
        }
      });

      const text = response.text;
      if (text) {
        res.json(JSON.parse(text));
      } else {
        throw new Error("Empty response from AI");
      }
    } catch (err: any) {
      console.error("Server processing error:", err);
      res.status(500).json({ error: err.message || "An error occurred while processing the audio." });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
