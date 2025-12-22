const { app, BrowserWindow } = require('electron');
const path = require('path');
const { spawn } = require('child_process');
const fs = require('fs');

let mainWindow;
let serverProcess;

const userDataPath = app.getPath('userData');
const dbPath = path.join(userDataPath, 'db.json');

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    title: "Kavin's Risco Control",
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true
    },
    autoHideMenuBar: true
  });

  const url = 'http://localhost:3004';
  
  const loadWithRetry = () => {
    mainWindow.loadURL(url).catch(() => {
      console.log('Servidor ainda não respondeu, tentando novamente em 1s...');
      setTimeout(loadWithRetry, 1000);
    });
  };

  loadWithRetry();

  mainWindow.on('closed', function () {
    mainWindow = null;
  });
}

function startServer() {
  // Em produção (app instalado), o caminho pode mudar dependendo de como o electron-builder empacota
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
  // Aguarda um pouco antes de criar a janela para o Express iniciar
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