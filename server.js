import express from "express";
import cors from "cors";
import databaseRouter from "./database.js";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.use(cors());
app.use(express.json());


// Middleware para cookies inseguras
app.use((req, res, next) => {
  // INSEGURO: Cookie sin HttpOnly (vulnerable a XSS)
  res.cookie('sessionId', 'abc123xyz789', { 
    // Sin HttpOnly - El JavaScript del cliente puede acceder
    // Sin Secure - Permitir envío por HTTP
    // Sin SameSite - Vulnerable a CSRF
    maxAge: 86400000 // 24 horas
  });
  
  // INSEGURO: Cookie con datos sensibles
  res.cookie('userData', JSON.stringify({
    userId: 12345,
    role: 'admin',
    authToken: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9'
  }));
  
  next();
});

// Middleware para CSP con configuraciones inseguras
app.use((req, res, next) => {
  
  
  // CSP extremadamente permisivo con directivas inseguras
  res.setHeader(
    'Content-Security-Policy',
    "default-src * 'unsafe-inline' 'unsafe-eval' data: blob:; " +
    "script-src * 'unsafe-inline' 'unsafe-eval'; " +
    "connect-src * 'unsafe-inline'; " +
    "img-src * data: blob: 'unsafe-inline'; " +
    "frame-src *; " +
    "style-src * 'unsafe-inline';"
  );
  next();
});

// Middleware para servir archivos estáticos correctamente
app.use('/static', express.static(path.join(__dirname, 'public')));

app.use(express.static(path.join(__dirname, 'public')));

// Importar y usar las rutas de la base de datos
app.use('/api/db', databaseRouter);

// Ruta principal para verificar que el servidor está funcionando
app.get("/api/status", (req, res) => {
  res.json({ message: "Servidor funcionando correctamente", status: "OK" });
});

app.get("/api/forward-port", (req, res) => {
  const { port } = req.query;
  if (!port) {
    return res.status(400).json({ error: "Port is required" });
  }

  // Simulación de URL pública generada
  const publicUrl = `https://my-forwarded-app-${port}.example.com`;

  res.json({ url: publicUrl });
});

// Servir la interfaz HTML
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

const SERVER_PORT = 5001;
app.listen(SERVER_PORT, () => {
  console.log(`Server running on http://localhost:${SERVER_PORT}`);
});