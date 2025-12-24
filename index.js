const { app, BrowserWindow } = require('electron');
const path = require('path');
const { spawn } = require('child_process');
const fs = require('fs');

let mainWindow;
let serverProcess;

// Localização fixa para facilitar que o usuário cole o backup
const dataFolder = 'C:\\KavinsRiscoControl';
const dbPath = path.join(dataFolder, 'db.json');

// Inicialização da pasta e arquivo se não existirem
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
    // Usa o favicon como ícone da janela
    icon: path.join(__dirname, 'dist', 'favicon.ico'),
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true
    },
    autoHideMenuBar: true
  });

  const url = 'http://127.0.0.1:3004';
  
  // Lógica robusta de carregamento: tenta até 10 vezes antes de desistir
  let attempts = 0;
  const loadWithRetry = () => {
    attempts++;
    mainWindow.loadURL(url).catch((err) => {
      console.log(`Tentativa ${attempts}: Servidor ainda não disponível...`);
      if (attempts < 10) {
        setTimeout(loadWithRetry, 1500);
      } else {
        mainWindow.loadHTML(`
          <body style="font-family:sans-serif; display:flex; flex-direction:column; align-items:center; justify-content:center; height:100vh; background:#f8fafc; color:#1e293b;">
            <h1 style="color:#2563eb">Ops! Ocorreu um erro.</h1>
            <p>O servidor interno não iniciou corretamente.</p>
            <button onclick="location.reload()" style="padding:10px 20px; background:#2563eb; color:white; border:none; border-radius:8px; cursor:pointer;">Tentar Novamente</button>
          </body>
        `);
      }
    });
  };

  loadWithRetry();

  mainWindow.on('closed', function () {
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
      DB_CUSTOM_PATH: dbPath, // O servidor usará o arquivo no C:\KavinsRiscoControl
      NODE_ENV: 'production'
    }
  });

  serverProcess.on('error', (err) => {
    console.error('Falha ao iniciar processo do servidor:', err);
  });
}

app.on('ready', () => {
  ensureDataDir();
  startServer();
  // Delay inicial para dar tempo ao Node de alocar a porta
  setTimeout(createWindow, 1000);
});

app.on('window-all-closed', function () {
  if (process.platform !== 'darwin') {
    if (serverProcess) serverProcess.kill();
    app.quit();
  }
});

app.on('activate', function () {
  if (mainWindow === null) createWindow();
});