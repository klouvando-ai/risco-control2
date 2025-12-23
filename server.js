require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 3004;
const DB_PATH = process.env.DB_CUSTOM_PATH || path.join(__dirname, 'db.json');

app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ limit: '10mb', extended: true }));

const initDB = () => {
  const dbDir = path.dirname(DB_PATH);
  if (!fs.existsSync(dbDir)) {
    fs.mkdirSync(dbDir, { recursive: true });
  }
  if (!fs.existsSync(DB_PATH)) {
    const initialData = { modelistas: [], referencias: [] };
    fs.writeFileSync(DB_PATH, JSON.stringify(initialData, null, 2), 'utf-8');
  }
};

const readDB = () => {
  try {
    if (!fs.existsSync(DB_PATH)) return { modelistas: [], referencias: [] };
    const data = fs.readFileSync(DB_PATH, 'utf-8');
    return JSON.parse(data);
  } catch (err) {
    console.error("Erro ao ler DB:", err);
    return { modelistas: [], referencias: [] };
  }
};

const writeDB = (data) => {
  try {
    fs.writeFileSync(DB_PATH, JSON.stringify(data, null, 2), 'utf-8');
    return true;
  } catch (err) {
    console.error("Erro ao escrever no arquivo DB:", err);
    return false;
  }
};

initDB();

const getTodayLocal = () => {
  const date = new Date();
  const offset = date.getTimezoneOffset();
  const localDate = new Date(date.getTime() - (offset * 60 * 1000));
  return localDate.toISOString().split('T')[0];
};

app.get('/api/modelistas', (req, res) => res.json(readDB().modelistas));
app.post('/api/modelistas', (req, res) => {
  const db = readDB();
  const modelista = req.body;
  const index = db.modelistas.findIndex(m => m.id === modelista.id);
  if (index !== -1) db.modelistas[index] = modelista;
  else db.modelistas.push(modelista);
  if (writeDB(db)) res.json({ success: true });
  else res.status(500).json({ error: "Erro ao salvar no arquivo" });
});
app.delete('/api/modelistas/:id', (req, res) => {
  const db = readDB();
  db.modelistas = db.modelistas.filter(m => m.id !== req.params.id);
  if (writeDB(db)) res.json({ success: true });
  else res.status(500).json({ error: "Erro ao excluir" });
});

app.get('/api/referencias', (req, res) => {
  const db = readDB();
  res.json([...db.referencias].sort((a, b) => b.dataPedido.localeCompare(a.dataPedido)));
});
app.post('/api/referencias', (req, res) => {
  const db = readDB();
  const ref = req.body;
  if (!ref.dataPedido) ref.dataPedido = getTodayLocal();
  const index = db.referencias.findIndex(r => r.id === ref.id);
  if (index !== -1) db.referencias[index] = { ...db.referencias[index], ...ref };
  else db.referencias.push(ref);
  if (writeDB(db)) res.json({ success: true });
  else res.status(500).json({ error: "Erro ao salvar referência" });
});
app.delete('/api/referencias/:id', (req, res) => {
  const db = readDB();
  db.referencias = db.referencias.filter(r => r.id !== req.params.id);
  if (writeDB(db)) res.json({ success: true });
  else res.status(500).json({ error: "Erro ao excluir referência" });
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
    if (writeDB(db)) res.json({ success: true });
    else res.status(500).json({ error: "Erro ao atualizar arquivo" });
  } else res.status(404).json({ error: "Não encontrado" });
});
app.post('/api/referencias/:id/pagar', (req, res) => {
  const db = readDB();
  const index = db.referencias.findIndex(r => r.id === req.params.id);
  if (index !== -1) {
    db.referencias[index].status = "Pago";
    db.referencias[index].dataPagamento = req.body.dataPagamento || getTodayLocal();
    if (writeDB(db)) res.json({ success: true });
    else res.status(500).json({ error: "Erro ao atualizar pagamento" });
  } else res.status(404).json({ error: "Não encontrado" });
});

const distPath = path.join(__dirname, 'dist');
app.use(express.static(distPath));
app.get('*', (req, res) => {
  const indexFile = path.join(distPath, 'index.html');
  if (fs.existsSync(indexFile)) res.sendFile(indexFile);
  else res.status(404).send('Pasta "dist" não encontrada.');
});

app.listen(PORT, '127.0.0.1', () => {
  console.log(`🚀 Servidor rodando em http://localhost:${PORT}`);
});