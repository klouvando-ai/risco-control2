const { app, BrowserWindow, ipcMain, Menu } = require('electron');
const path = require('path');
const fs = require('fs');

let mainWindow;
const dataFolder = path.join(app.getPath('userData'), 'Database');
const dbPath = path.join(dataFolder, 'db.json');

// Inicialização do Banco de Dados Local
function ensureDB() {
  try {
    if (!fs.existsSync(dataFolder)) fs.mkdirSync(dataFolder, { recursive: true });
    if (!fs.existsSync(dbPath)) {
      fs.writeFileSync(dbPath, JSON.stringify({ modelistas: [], referencias: [] }, null, 2), 'utf8');
    }
  } catch (err) { console.error(err); }
}

const readDB = () => JSON.parse(fs.readFileSync(dbPath, 'utf8'));
const writeDB = (data) => fs.writeFileSync(dbPath, JSON.stringify(data, null, 2), 'utf8');

// Handlers IPC
ipcMain.handle('db-get-modelistas', () => readDB().modelistas);
ipcMain.handle('db-save-modelista', (e, m) => {
  const db = readDB();
  const i = db.modelistas.findIndex(x => x.id === m.id);
  if (i !== -1) db.modelistas[i] = m; else db.modelistas.push(m);
  writeDB(db); return true;
});
ipcMain.handle('db-delete-modelista', (e, id) => {
  const db = readDB();
  db.modelistas = db.modelistas.filter(x => x.id !== id);
  writeDB(db); return true;
});
ipcMain.handle('db-get-referencias', () => readDB().referencias.sort((a,b) => b.id.localeCompare(a.id)));
ipcMain.handle('db-save-referencia', (e, r) => {
  const db = readDB();
  const i = db.referencias.findIndex(x => x.id === r.id);
  if (i !== -1) db.referencias[i] = r; else db.referencias.push(r);
  writeDB(db); return true;
});
ipcMain.handle('db-delete-referencia', (e, id) => {
  const db = readDB();
  db.referencias = db.referencias.filter(x => x.id !== id);
  writeDB(db); return true;
});

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    title: "Kavin's Risco Control",
    backgroundColor: '#f8fafc',
    // Ícone do executável
    icon: path.join(__dirname, 'dist', 'favicon.ico'),
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: true, // Aumenta a segurança isolando o processo
      devTools: false // DESATIVA O CONSOLE COMPLETAMENTE
    },
    autoHideMenuBar: true
  });

  // Remove o menu de cima (File, Edit, etc) completamente
  Menu.setApplicationMenu(null);

  const indexPath = path.join(__dirname, 'dist', 'index.html');
  if (fs.existsSync(indexPath)) {
    mainWindow.loadFile(indexPath);
  }

  // Bloqueia atalhos de teclado do navegador (F12, Ctrl+Shift+I, Ctrl+R)
  mainWindow.webContents.on('before-input-event', (event, input) => {
    if (input.control && input.shift && input.key.toLowerCase() === 'i') event.preventDefault();
    if (input.key === 'F12') event.preventDefault();
    if (input.control && input.key.toLowerCase() === 'r') event.preventDefault();
  });

  mainWindow.on('closed', () => { mainWindow = null; });
}

app.on('ready', () => {
  ensureDB();
  createWindow();
});

app.on('window-all-closed', () => { if (process.platform !== 'darwin') app.quit(); });