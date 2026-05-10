import express from "express";
import path from "path";
import { fileURLToPath } from "url";
import { createServer as createViteServer } from "vite";
import dotenv from "dotenv";

import { GoogleGenAI, ThinkingLevel } from "@google/genai";

// Carrega variáveis do .env em desenvolvimento
dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  app.use(express.json());
  const PORT = Number(process.env.PORT) || 3000;
  const isProduction = process.env.NODE_ENV === "production";

  console.log(`Iniciando servidor em modo: ${isProduction ? "PRODUÇÃO" : "DESENVOLVIMENTO"}`);

  // Configuração da IA no Backend (Seguro, a chave fica no Server/Cloud Run)
  const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

  app.post("/api/gemini", async (req, res) => {
    try {
      const { prompt, systemInstruction, type } = req.body;
      
      let model = "gemini-3-flash-preview";
      let config: any = { systemInstruction };

      switch (type) {
        case "fast":
          model = "gemini-3.1-flash-lite-preview";
          config.systemInstruction = systemInstruction || "Você é um assistente rápido para tarefas simples.";
          break;
        case "general":
          model = "gemini-3-flash-preview";
          config.systemInstruction = systemInstruction || "Você é um assistente inteligente para tarefas gerais.";
          break;
        case "searchGrounded":
          model = "gemini-3-flash-preview";
          config.tools = [{ googleSearch: {} }];
          config.systemInstruction = systemInstruction || "Você é um assistente que utiliza dados da pesquisa Google para fornecer informações atualizadas.";
          break;
        case "complex":
          model = "gemini-3.1-pro-preview";
          config.systemInstruction = systemInstruction || "Você é um assistente avançado para tarefas complexas.";
          break;
        case "highThinking":
          model = "gemini-3.1-pro-preview";
          config.thinkingConfig = { thinkingLevel: ThinkingLevel.HIGH };
          config.systemInstruction = systemInstruction || "Você é um assistente de alta performance capaz de lidar com as consultas mais complexas dos usuários através de um raciocínio profundo.";
          break;
        default:
          model = "gemini-3-flash-preview";
      }

      const response = await ai.models.generateContent({
        model,
        contents: prompt,
        config,
      });

      res.json({ text: response.text });
    } catch (error) {
      console.error("Gemini API Error:", error);
      res.status(500).json({ error: "Failed to generate content" });
    }
  });

  // Health check route
  app.get("/api/health", (req, res) => {
    res.json({ 
      status: "ok", 
      env: process.env.NODE_ENV,
      port: PORT,
      database: process.env.VITE_FIREBASE_DATABASE_ID || process.env.VITE_FIREBASE_FIRESTORE_DATABASE_ID
    });
  });

  // Vite middleware for development
  if (!isProduction) {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    // Serve os arquivos estáticos da pasta 'dist' em produção
    const distPath = path.join(process.cwd(), 'dist');
    console.log(`Servindo arquivos estáticos de: ${distPath}`);
    
    // Middleware para logar requisições de assets
    app.use('/assets', (req, res, next) => {
      console.log(`Requisição de asset: ${req.url}`);
      next();
    });

    app.use(express.static(distPath, {
      maxAge: '1d',
      etag: true
    }));
    
    app.get('*', (req, res) => {
      // Se a requisição parece ser de um arquivo (tem extensão) e não foi encontrada pelo express.static
      if (req.url.includes('.') && !req.url.endsWith('.html')) {
        console.warn(`Arquivo não encontrado (404): ${req.url}`);
        return res.status(404).send('Not Found');
      }
      
      console.log(`Servindo index.html para: ${req.url}`);
      res.sendFile(path.join(distPath, 'index.html'), { maxAge: 0 });
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Servidor rodando em http://0.0.0.0:${PORT}`);
  });
}

startServer();
