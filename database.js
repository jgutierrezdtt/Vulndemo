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

// Endpoint con vulnerabilidad de inyección SQL
router.get('/user', (req, res) => {
  const userId = req.query.id;
  
  // INSEGURO: Consulta SQL no parametrizada
  const query = `SELECT * FROM users WHERE id = ${userId}`;
  
  dbConnection.query(query, (error, results) => {
    if (error) {
      return res.status(500).json({ error: 'Database error', details: error.message });
    }
    res.json(results);
  });
});

// Endpoint con consulta SQL insegura para login
router.post('/login', (req, res) => {
  const { username, password } = req.body;
  
  // INSEGURO: Vulnerable a inyección SQL
  const query = `SELECT * FROM users WHERE username = '${username}' AND password = '${password}'`;
  
  dbConnection.query(query, (error, results) => {
    if (error) {
      return res.status(500).json({ error: 'Error de login', details: error.message });
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
    const data = await request(endpoint, query);
    res.json(data);
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
  
  dbConnection.query(query, (error, results) => {
    if (error) {
      return res.status(500).json({ error: 'Error en consulta', details: error.message });
    }
    
    // INSEGURO: Retorna información sensible
    res.json(results);
  });
});

export default router;