import express from "express";
import path from "path";
import { fileURLToPath } from "url";
import { createServer as createViteServer } from "vite";
import dotenv from "dotenv";

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
