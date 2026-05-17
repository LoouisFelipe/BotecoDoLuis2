import express from "express";
import path from "path";
import { fileURLToPath } from "url";
import { createServer as createViteServer } from "vite";
import dotenv from "dotenv";

import { genkit } from "genkit";
import { googleAI } from "@genkit-ai/google-genai";
// import { mcpClient } from "genkitx-mcp"; // Genkit MCP Client (Incompatível com Genkit 1.34.0)

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

  // Configuração da IA no Backend via Genkit (Oficial)
  // Configurando o MCP (Model Context Protocol)
  let plugins: any[] = [googleAI({ apiKey: process.env.GEMINI_API_KEY })];

  try {
    // Inicialização do Servidor MCP Local (ex: n8n)
    // O Genkit gerencia o ciclo de vida do cliente MCP
    if (process.env.N8N_URL && process.env.N8N_API_KEY) {
      console.warn("⚠️ MCP Client (n8n) temporariamente desabilitado devido à incompatibilidade com o Genkit 1.34.0.");
      /*
      const mcpPlugin = mcpClient({
        name: "n8n-mcp",
        serverProcess: {
          command: "npx",
          args: ["-y", "@leonardsellem/n8n-mcp-server"],
          env: {
            ...process.env,
            N8N_URL: process.env.N8N_URL,
            N8N_API_KEY: process.env.N8N_API_KEY,
          } as NodeJS.ProcessEnv
        }
      });
      plugins.push(mcpPlugin);
      console.log("✅ MCP Client (n8n) configurado com sucesso.");
      */
    } else {
      console.warn("⚠️ MCP Client (n8n) ignorado: Variáveis N8N_URL e N8N_API_KEY não definidas.");
    }
  } catch (mcpError) {
    console.error("❌ Erro ao inicializar cliente MCP:", mcpError);
  }

  const ai = genkit({ plugins });

  app.post("/api/gemini", async (req, res) => {
    try {
      const { prompt, systemInstruction, type } = req.body;
      
      let model: any = googleAI.model('gemini-2.5-flash');
      let config: any = { systemInstruction };

      switch (type) {
        case "fast":
        case "general":
          model = googleAI.model('gemini-2.5-flash');
          config.systemInstruction = systemInstruction || "Você é um assistente inteligente para tarefas gerais.";
          break;
        case "searchGrounded":
        case "complex":
        case "highThinking":
          model = googleAI.model('gemini-2.5-pro');
          config.systemInstruction = systemInstruction || "Você é um assistente de alta performance capaz de lidar com tarefas complexas.";
          break;
        default:
          model = googleAI.model('gemini-2.5-flash');
      }

      const response = await ai.generate({
        model,
        prompt,
        config,
      });

      res.json({ text: response.text });
    } catch (error) {
      console.error("Genkit API Error:", error);
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
