const { app, BrowserWindow } = require('electron');
const path = require('path');
const { spawn } = require('child_process');
const fs = require('fs');

let mainWindow;
let serverProcess;

const dataFolder = 'C:\\KavinsRiscoControl';
const dbPath = path.join(dataFolder, 'db.json');

function ensureDataDir() {
  if (!fs.existsSync(dataFolder)) {
    try {
      fs.mkdirSync(dataFolder, { recursive: true });
    } catch (err) {
      console.error("Erro ao criar pasta no C:", err);
    }
  }
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    title: "Kavin's Risco Control",
    icon: path.join(__dirname, 'dist', 'favicon.ico'),
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true
    },
    autoHideMenuBar: true
  });

  // Usamos 127.0.0.1 para evitar resoluções de DNS desnecessárias offline
  const url = 'http://127.0.0.1:3004';
  
  let attempts = 0;
  const loadWithRetry = () => {
    attempts++;
    mainWindow.loadURL(url).catch((err) => {
      console.log(`Tentativa ${attempts}: Aguardando servidor local...`);
      if (attempts < 15) {
        setTimeout(loadWithRetry, 1000);
      } else {
        mainWindow.loadHTML(`
          <body style="font-family:sans-serif; display:flex; flex-direction:column; align-items:center; justify-content:center; height:100vh; background:#f1f5f9; color:#334155; margin:0;">
            <div style="background:white; padding:40px; border-radius:16px; box-shadow:0 4px 6px -1px rgba(0,0,0,0.1); text-align:center;">
              <h1 style="color:#2563eb; margin-bottom:10px;">Erro de Conexão Local</h1>
              <p>O serviço de banco de dados não pôde ser iniciado.</p>
              <button onclick="location.reload()" style="margin-top:20px; padding:12px 24px; background:#2563eb; color:white; border:none; border-radius:8px; cursor:pointer; font-weight:bold;">Tentar Abrir Novamente</button>
            </div>
          </body>
        `);
      }
    });
  };

  loadWithRetry();

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

function startServer() {
  const serverPath = path.join(__dirname, 'server.js');
  
  serverProcess = spawn('node', [serverPath], {
    shell: true,
    env: { 
      ...process.env, 
      PORT: 3004,
      DB_CUSTOM_PATH: dbPath,
      NODE_ENV: 'production'
    }
  });

  serverProcess.on('error', (err) => {
    console.error('Falha no servidor:', err);
  });
}

app.on('ready', () => {
  ensureDataDir();
  startServer();
  setTimeout(createWindow, 1000);
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    if (serverProcess) serverProcess.kill();
    app.quit();
  }
});