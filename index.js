const { app, BrowserWindow } = require('electron');
const path = require('path');
const { spawn } = require('child_process');
const fs = require('fs');

let mainWindow;
let serverProcess;

// Define a pasta de dados diretamente no C: para facilitar a localização pelo usuário
const dataFolder = 'C:\\KavinsRiscoControl';
const dbPath = path.join(dataFolder, 'db.json');

// Garante que a pasta no C: existe antes de iniciar o servidor
if (!fs.existsSync(dataFolder)) {
  try {
    fs.mkdirSync(dataFolder, { recursive: true });
    console.log(`Pasta criada em: ${dataFolder}`);
  } catch (err) {
    console.error("Erro ao criar pasta no C:. Usando pasta padrão do sistema.", err);
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

  const url = 'http://localhost:3004';
  
  const loadWithRetry = () => {
    mainWindow.loadURL(url).catch(() => {
      console.log('Aguardando servidor...');
      setTimeout(loadWithRetry, 1000);
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
      DB_CUSTOM_PATH: dbPath,
      NODE_ENV: 'production'
    }
  });

  serverProcess.stdout.on('data', (data) => {
    console.log(`[Server]: ${data}`);
  });

  serverProcess.stderr.on('data', (data) => {
    console.error(`[Server Error]: ${data}`);
  });
}

app.on('ready', () => {
  startServer();
  setTimeout(createWindow, 1500);
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