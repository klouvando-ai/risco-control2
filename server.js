
import 'dotenv/config';
import express from 'express';
import mysql from 'mysql2/promise';
import cors from 'cors';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3004;

app.use(cors());
app.use(express.json({ limit: '10mb' }));

// Auxiliar para garantir formato YYYY-MM-DD local para o MySQL
const getTodayLocal = () => {
  const date = new Date();
  const offset = date.getTimezoneOffset();
  const localDate = new Date(date.getTime() - (offset * 60 * 1000));
  return localDate.toISOString().split('T')[0];
};

const formatDateForMySQL = (dateStr) => {
  if (!dateStr) return null;
  return dateStr.split('T')[0];
};

// Log de requisições API
app.use((req, res, next) => {
  if (req.url.startsWith('/api')) {
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
  }
  next();
});

let pool = null;
let dbError = null;

const dbConfig = {
  host: process.env.DB_HOST || '127.0.0.1',
  port: process.env.DB_PORT ? Number(process.env.DB_PORT) : 3306,
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || 'Benvindo199380@',
  database: process.env.DB_NAME || 'risco',
  waitForConnections: true,
  connectionLimit: 10,
  charset: 'utf8mb4'
};

async function initDB() {
  try {
    console.log('📡 Conectando ao MySQL...');
    const { database, ...cfgNoDb } = dbConfig;
    const conn = await mysql.createConnection(cfgNoDb);
    await conn.query(`CREATE DATABASE IF NOT EXISTS \`${database}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`);
    await conn.end();

    pool = mysql.createPool(dbConfig);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS modelistas (
        id VARCHAR(50) PRIMARY KEY,
        nome VARCHAR(255) NOT NULL,
        valorPorMetro DECIMAL(10,2) NOT NULL,
        telefone VARCHAR(50),
        observacoes TEXT,
        ativa BOOLEAN DEFAULT TRUE
      ) ENGINE=InnoDB
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS referencias (
        id VARCHAR(50) PRIMARY KEY,
        codigo VARCHAR(50) NOT NULL,
        descricao VARCHAR(255),
        dataPedido DATE,
        modelistaId VARCHAR(50),
        observacoes TEXT,
        medidaConsiderada DECIMAL(10,2) DEFAULT 0,
        status VARCHAR(50),
        comprimentoFinal DECIMAL(10,2),
        dataRecebimento DATE,
        valorTotal DECIMAL(10,2),
        dataPagamento DATE,
        CONSTRAINT fk_modelista FOREIGN KEY (modelistaId) REFERENCES modelistas(id) ON DELETE SET NULL
      ) ENGINE=InnoDB
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS rolos (
        id VARCHAR(50) PRIMARY KEY,
        referenciaId VARCHAR(50),
        medida DECIMAL(10,2),
        CONSTRAINT fk_referencia FOREIGN KEY (referenciaId) REFERENCES referencias(id) ON DELETE CASCADE
      ) ENGINE=InnoDB
    `);

    console.log('✅ Banco de dados pronto na porta 3004');
  } catch (err) {
    console.error('❌ Erro no banco:', err.message);
    dbError = err.message;
  }
}

initDB();

app.use('/api', (req, res, next) => {
  if (!pool) return res.status(503).json({ error: 'Banco indisponível', details: dbError });
  next();
});

// --- API ---

app.get('/api/modelistas', async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM modelistas ORDER BY nome');
    res.json(rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post('/api/modelistas', async (req, res) => {
  const { id, nome, valorPorMetro, telefone, observacoes, ativa } = req.body;
  try {
    await pool.query(
      `INSERT INTO modelistas (id, nome, valorPorMetro, telefone, observacoes, ativa) 
       VALUES (?, ?, ?, ?, ?, ?) ON DUPLICATE KEY UPDATE 
       nome=?, valorPorMetro=?, telefone=?, observacoes=?, ativa=?`,
      [id, nome, valorPorMetro, telefone, observacoes, ativa, nome, valorPorMetro, telefone, observacoes, ativa]
    );
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.delete('/api/modelistas/:id', async (req, res) => {
  try {
    await pool.query('DELETE FROM modelistas WHERE id=?', [req.params.id]);
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.get('/api/referencias', async (req, res) => {
  try {
    const [refs] = await pool.query('SELECT * FROM referencias ORDER BY dataPedido DESC');
    const [rolos] = await pool.query('SELECT * FROM rolos');
    const data = refs.map(r => ({
      ...r,
      rolos: rolos.filter(ro => ro.referenciaId === r.id)
    }));
    res.json(data);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post('/api/referencias', async (req, res) => {
  const { id, codigo, descricao, dataPedido, modelistaId, observacoes, status, medidaConsiderada, rolos } = req.body;
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    
    const mConsiderada = parseFloat(medidaConsiderada) || 0;
    // Se não houver dataPedido, usa hoje local
    const cleanDataPedido = dataPedido ? formatDateForMySQL(dataPedido) : getTodayLocal();

    await conn.query(
      `INSERT INTO referencias (id, codigo, descricao, dataPedido, modelistaId, observacoes, medidaConsiderada, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE
       codigo=?, descricao=?, dataPedido=?, modelistaId=?, observacoes=?, medidaConsiderada=?, status=?`,
      [
        id, codigo, descricao, cleanDataPedido, modelistaId || null, observacoes, mConsiderada, status,
        codigo, descricao, cleanDataPedido, modelistaId || null, observacoes, mConsiderada, status
      ]
    );

    await conn.query('DELETE FROM rolos WHERE referenciaId=?', [id]);
    if (rolos && Array.isArray(rolos)) {
      for (const r of rolos) {
        if (r.id && r.medida) {
          const mRolo = typeof r.medida === 'string' ? parseFloat(r.medida.replace(',', '.')) : r.medida;
          await conn.query('INSERT INTO rolos (id, referenciaId, medida) VALUES (?, ?, ?)', [r.id, id, mRolo]);
        }
      }
    }

    await conn.commit();
    res.json({ success: true });
  } catch (err) {
    await conn.rollback();
    console.error('Erro ao salvar referência:', err);
    res.status(500).json({ error: err.message });
  } finally {
    conn.release();
  }
});

app.post('/api/referencias/:id/receber', async (req, res) => {
  const { comprimentoFinal, dataRecebimento, valorTotal, observacoes } = req.body;
  try {
    const cFinal = typeof comprimentoFinal === 'string' ? parseFloat(comprimentoFinal.replace(',', '.')) : comprimentoFinal;
    const vTotal = typeof valorTotal === 'string' ? parseFloat(valorTotal.replace(',', '.')) : valorTotal;
    const cleanDataRecebimento = dataRecebimento ? formatDateForMySQL(dataRecebimento) : getTodayLocal();

    await pool.query(
      'UPDATE referencias SET comprimentoFinal=?, dataRecebimento=?, valorTotal=?, observacoes=?, status="Risco Recebido" WHERE id=?',
      [cFinal, cleanDataRecebimento, vTotal, observacoes, req.params.id]
    );
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post('/api/referencias/:id/pagar', async (req, res) => {
  const { dataPagamento } = req.body;
  try {
    const cleanDataPagamento = dataPagamento ? formatDateForMySQL(dataPagamento) : getTodayLocal();
    await pool.query('UPDATE referencias SET dataPagamento=?, status="Pago" WHERE id=?', [cleanDataPagamento, req.params.id]);
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

const distPath = path.join(__dirname, 'dist');
app.use(express.static(distPath));

app.use((req, res) => {
  if (req.url.startsWith('/api')) return res.status(404).json({ error: 'Rota API não encontrada' });
  const indexFile = path.join(distPath, 'index.html');
  if (fs.existsSync(indexFile)) return res.sendFile(indexFile);
  res.status(404).send('Frontend não encontrado. Execute npm run build.');
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Risco API rodando na porta ${PORT}`);
});
