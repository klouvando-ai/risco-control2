import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3004;
const DB_PATH = path.join(__dirname, 'db.json');

app.use(cors());
app.use(express.json({ limit: '10mb' }));

// --- LOGICA DE BANCO DE DADOS JSON ---

const initDB = () => {
  if (!fs.existsSync(DB_PATH)) {
    const initialData = {
      modelistas: [],
      referencias: []
    };
    fs.writeFileSync(DB_PATH, JSON.stringify(initialData, null, 2), 'utf-8');
    console.log('📦 Banco de dados JSON inicializado.');
  }
};

const readDB = () => {
  try {
    const data = fs.readFileSync(DB_PATH, 'utf-8');
    return JSON.parse(data);
  } catch (err) {
    return { modelistas: [], referencias: [] };
  }
};

const writeDB = (data) => {
  try {
    fs.writeFileSync(DB_PATH, JSON.stringify(data, null, 2), 'utf-8');
  } catch (err) {
    console.error("Erro ao salvar dados:", err);
  }
};

initDB();

const getTodayLocal = () => {
  const date = new Date();
  const offset = date.getTimezoneOffset();
  const localDate = new Date(date.getTime() - (offset * 60 * 1000));
  return localDate.toISOString().split('T')[0];
};

// --- API ROUTES ---

app.get('/api/modelistas', (req, res) => {
  const db = readDB();
  res.json(db.modelistas);
});

app.post('/api/modelistas', (req, res) => {
  const db = readDB();
  const modelista = req.body;
  const index = db.modelistas.findIndex(m => m.id === modelista.id);
  if (index !== -1) db.modelistas[index] = modelista;
  else db.modelistas.push(modelista);
  writeDB(db);
  res.json({ success: true });
});

app.delete('/api/modelistas/:id', (req, res) => {
  const db = readDB();
  db.modelistas = db.modelistas.filter(m => m.id !== req.params.id);
  writeDB(db);
  res.json({ success: true });
});

app.get('/api/referencias', (req, res) => {
  const db = readDB();
  const sorted = [...db.referencias].sort((a, b) => b.dataPedido.localeCompare(a.dataPedido));
  res.json(sorted);
});

app.post('/api/referencias', (req, res) => {
  const db = readDB();
  const ref = req.body;
  if (!ref.dataPedido) ref.dataPedido = getTodayLocal();
  const index = db.referencias.findIndex(r => r.id === ref.id);
  if (index !== -1) db.referencias[index] = { ...db.referencias[index], ...ref };
  else db.referencias.push(ref);
  writeDB(db);
  res.json({ success: true });
});

app.post('/api/referencias/:id/receber', (req, res) => {
  const db = readDB();
  const { comprimentoFinal, dataRecebimento, valorTotal, observacoes } = req.body;
  const index = db.referencias.findIndex(r => r.id === req.params.id);
  if (index !== -1) {
    db.referencias[index] = {
      ...db.referencias[index],
      comprimentoFinal: parseFloat(comprimentoFinal),
      dataRecebimento: dataRecebimento || getTodayLocal(),
      valorTotal: parseFloat(valorTotal),
      observacoes: observacoes,
      status: "Risco Recebido"
    };
    writeDB(db);
    res.json({ success: true });
  } else {
    res.status(404).json({ error: "Não encontrado" });
  }
});

app.post('/api/referencias/:id/pagar', (req, res) => {
  const db = readDB();
  const { dataPagamento } = req.body;
  const index = db.referencias.findIndex(r => r.id === req.params.id);
  if (index !== -1) {
    db.referencias[index].status = "Pago";
    db.referencias[index].dataPagamento = dataPagamento || getTodayLocal();
    writeDB(db);
    res.json({ success: true });
  } else {
    res.status(404).json({ error: "Não encontrado" });
  }
});

const distPath = path.join(__dirname, 'dist');
app.use(express.static(distPath));

app.use((req, res) => {
  const indexFile = path.join(distPath, 'index.html');
  if (fs.existsSync(indexFile)) res.sendFile(indexFile);
  else res.status(404).send('Execute npm run build primeiro.');
});

app.listen(PORT, '127.0.0.1', () => {
  console.log(`🚀 Servidor rodando em http://localhost:${PORT}`);
});