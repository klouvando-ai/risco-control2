const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const fs = require('fs');

let mainWindow;
// O banco de dados fica na pasta de dados do usuário do Windows (AppData/Roaming/Kavins Risco Control)
const dataFolder = path.join(app.getPath('userData'), 'Database');
const dbPath = path.join(dataFolder, 'db.json');

// Inicialização do Banco de Dados Local
function ensureDB() {
  try {
    if (!fs.existsSync(dataFolder)) {
      fs.mkdirSync(dataFolder, { recursive: true });
    }
    if (!fs.existsSync(dbPath)) {
      const initialData = { modelistas: [], referencias: [] };
      fs.writeFileSync(dbPath, JSON.stringify(initialData, null, 2), 'utf8');
    }
  } catch (err) {
    console.error("Erro ao inicializar banco de dados:", err);
  }
}

function readDB() {
  try {
    const data = fs.readFileSync(dbPath, 'utf8');
    return JSON.parse(data);
  } catch (err) {
    console.error("Erro ao ler banco de dados:", err);
    return { modelistas: [], referencias: [] };
  }
}

function writeDB(data) {
  try {
    fs.writeFileSync(dbPath, JSON.stringify(data, null, 2), 'utf8');
    return true;
  } catch (err) {
    console.error("Erro ao gravar banco de dados:", err);
    return false;
  }
}

// Handlers IPC (Inter-Process Communication)
ipcMain.handle('db-get-modelistas', () => readDB().modelistas);

ipcMain.handle('db-save-modelista', (event, modelista) => {
  const db = readDB();
  const index = db.modelistas.findIndex(m => m.id === modelista.id);
  if (index !== -1) {
    db.modelistas[index] = modelista;
  } else {
    db.modelistas.push(modelista);
  }
  return writeDB(db);
});

ipcMain.handle('db-delete-modelista', (event, id) => {
  const db = readDB();
  db.modelistas = db.modelistas.filter(m => m.id !== id);
  return writeDB(db);
});

ipcMain.handle('db-get-referencias', () => {
  const db = readDB();
  return db.referencias.sort((a, b) => b.id.localeCompare(a.id));
});

ipcMain.handle('db-save-referencia', (event, ref) => {
  const db = readDB();
  const index = db.referencias.findIndex(r => r.id === ref.id);
  if (index !== -1) {
    db.referencias[index] = { ...db.referencias[index], ...ref };
  } else {
    db.referencias.push(ref);
  }
  return writeDB(db);
});

ipcMain.handle('db-delete-referencia', (event, id) => {
  const db = readDB();
  db.referencias = db.referencias.filter(r => r.id !== id);
  return writeDB(db);
});

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    title: "Kavin's Risco Control",
    backgroundColor: '#f8fafc',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: false
    },
    autoHideMenuBar: true
  });

  // Carregamento NATIVO via arquivo local
  const indexPath = path.join(__dirname, 'dist', 'index.html');
  
  if (fs.existsSync(indexPath)) {
    mainWindow.loadFile(indexPath);
  } else {
    // Fallback para desenvolvimento caso o dist não exista
    mainWindow.loadURL('http://localhost:3004').catch(() => {
       mainWindow.loadHTML(`
        <div style="font-family: sans-serif; padding: 50px; text-align: center;">
          <h1 style="color: #ef4444;">Erro de Inicialização</h1>
          <p>A pasta de distribuição (dist) não foi encontrada.</p>
          <p>Por favor, execute <b>npm run build</b> antes de iniciar o aplicativo.</p>
        </div>
      `);
    });
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

app.on('ready', () => {
  ensureDB();
  createWindow();
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (mainWindow === null) {
    createWindow();
  }
});