import express from 'express';
import mysql from 'mysql';
import { request, gql } from 'graphql-request';
import bodyParser from 'body-parser';

const router = express.Router();
router.use(bodyParser.json());

// Conexión a base de datos SQL insegura (credenciales hardcodeadas)
const dbConnection = mysql.createConnection({
  host: 'localhost',
  user: 'root',
  password: 'password123',
  database: 'usuarios_db'
});

// Conectar a la base de datos al iniciar
dbConnection.connect(function(err) {
  if (err) {
    console.error('Error conectando a la base de datos:', err.stack);
    return;
  }
  console.log('Conexión a la base de datos establecida con ID ' + dbConnection.threadId);
});

// Simulación de datos para cuando la base de datos real no está disponible
const mockUsers = [
  { id: 1, username: 'admin', password: 'admin123', email: 'admin@example.com', role: 'admin', credit_card_number: '4111-1111-1111-1111', password_hash: 'a1b2c3d4e5f6' },
  { id: 2, username: 'usuario', password: 'pass123', email: 'usuario@example.com', role: 'user', credit_card_number: '5555-5555-5555-4444', password_hash: 'f6e5d4c3b2a1' }
];

// Endpoint con vulnerabilidad de inyección SQL
router.get('/user', (req, res) => {
  const userId = req.query.id;
  
  // INSEGURO: Consulta SQL no parametrizada
  const query = `SELECT * FROM users WHERE id = ${userId}`;
  
  // Intenta ejecutar la consulta real y si falla, usa datos simulados
  dbConnection.query(query, (error, results) => {
    if (error) {
      console.log('Error en consulta SQL, usando datos mockup:', error.message);
      // Simular resultados si la base de datos real falla
      const mockResult = mockUsers.filter(user => user.id == userId);
      return res.json(mockResult.length ? mockResult : []);
    }
    res.json(results);
  });
});

// Endpoint con consulta SQL insegura para login
router.post('/login', (req, res) => {
  const { username, password } = req.body;
  
  // INSEGURO: Vulnerable a inyección SQL
  const query = `SELECT * FROM users WHERE username = '${username}' AND password = '${password}'`;
  
  // Intenta ejecutar la consulta real y si falla, usa datos simulados
  dbConnection.query(query, (error, results) => {
    if (error) {
      console.log('Error en login SQL, usando datos mockup:', error.message);
      // Simular login si la base de datos real falla
      const mockResult = mockUsers.filter(user => user.username === username && user.password === password);
      if (mockResult.length > 0) {
        return res.json({ success: true, user: mockResult[0] });
      } else {
        return res.status(401).json({ success: false, message: 'Credenciales inválidas' });
      }
    }
    
    if (results.length > 0) {
      res.json({ success: true, user: results[0] });
    } else {
      res.status(401).json({ success: false, message: 'Credenciales inválidas' });
    }
  });
});

// Endpoint con consulta GraphQL insegura
router.get('/graphql-user', async (req, res) => {
  const userId = req.query.id;
  const endpoint = 'https://api.example.com/graphql';
  
  // INSEGURO: Inyección en consulta GraphQL
  const query = gql`
    query {
      user(id: ${userId}) {
        id
        name
        email
        role
      }
    }
  `;
  
  try {
    // Intenta hacer la consulta real, pero si falla, usa datos simulados
    try {
      const data = await request(endpoint, query);
      res.json(data);
    } catch (graphqlError) {
      console.log('Error en consulta GraphQL, usando datos mockup:', graphqlError.message);
      // Simular resultados GraphQL
      const mockResult = mockUsers.find(user => user.id == userId);
      if (mockResult) {
        res.json({ user: { id: mockResult.id, name: mockResult.username, email: mockResult.email, role: mockResult.role } });
      } else {
        res.json({ user: null });
      }
    }
  } catch (error) {
    res.status(500).json({ error: 'GraphQL error', details: error.message });
  }
});

// Endpoint que filtra información sensible incorrectamente
router.get('/user-data', (req, res) => {
  const userId = req.query.id;
  
  // INSEGURO: No validación de entrada y consulta no parametrizada
  const query = `
    SELECT id, username, email, credit_card_number, password_hash 
    FROM users 
    WHERE id = ${userId} OR role = 'admin'
  `;
  
  // Intenta ejecutar la consulta real y si falla, usa datos simulados
  dbConnection.query(query, (error, results) => {
    if (error) {
      console.log('Error en consulta de datos de usuario, usando datos mockup:', error.message);
      // Simular resultados si la base de datos real falla
      res.json(mockUsers.filter(user => user.id == userId || user.role === 'admin'));
    } else {
      // INSEGURO: Retorna información sensible
      res.json(results);
    }
  });
});

// Nuevo endpoint para ejecutar código JavaScript
router.post('/execute-query', (req, res) => {
  const { query } = req.body;
  
  if (!query) {
    return res.status(400).json({ error: 'Query parameter is required' });
  }
  
  try {
    let codeToExecute = query;
    
    // Extraer el código de las etiquetas <script> si existen
    if (query.includes('<script>') && query.includes('</script>')) {
      const scriptPattern = /<script>([\s\S]*?)<\/script>/;
      const matches = query.match(scriptPattern);
      
      if (matches && matches[1]) {
        codeToExecute = matches[1].trim();
      } else {
        return res.status(400).json({ 
          error: 'Error executing query', 
          details: 'Could not extract code from <script> tags. Make sure your tags are properly formatted.' 
        });
      }
    }
    
    // Capturar la salida de console.log
    let logOutput = [];
    const originalConsoleLog = console.log;
    console.log = (...args) => {
      logOutput.push(args.map(arg => 
        typeof arg === 'object' ? JSON.stringify(arg) : String(arg)
      ).join(' '));
      originalConsoleLog(...args);
    };
    
    // Mensajes de alertas
    let alertMessages = [];
    
    // Crear contexto de ejecución con funciones simuladas del navegador
    const context = {
      alert: (message) => {
        alertMessages.push(String(message));
        return message;
      },
      prompt: (message, defaultValue) => {
        alertMessages.push(`Prompt: ${message} (Default: ${defaultValue || ''})`);
        return defaultValue || '';
      },
      confirm: (message) => {
        alertMessages.push(`Confirm: ${message}`);
        return true;
      },
      console: {
        log: console.log
      }
    };
    
    // EXTREMADAMENTE INSEGURO: Ejecuta código JavaScript arbitrario con contexto
    // eslint-disable-next-line no-new-func
    const func = new Function('context', `
      with(context) {
        ${codeToExecute}
      }
      return context;
    `);
    
    // Ejecutar la función con el contexto
    const executionContext = func(context);
    
    // Restaurar console.log original
    console.log = originalConsoleLog;
    
    // Devolver tanto el resultado como la salida capturada y alertas
    res.json({ 
      consoleOutput: logOutput.length > 0 ? logOutput.join('\n') : undefined,
      executedCode: codeToExecute,
      alerts: alertMessages.length > 0 ? alertMessages : undefined
    });
  } catch (error) {
    // Proporcionar un mensaje de error más detallado
    res.status(500).json({ 
      error: 'Error executing query', 
      details: error.message,
      tip: 'Asegúrate de que el código sea JavaScript válido. Ahora puedes usar alert(), prompt() y confirm(), pero estas funciones están simuladas en el servidor.' 
    });
  }
});

export default router;