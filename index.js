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

  // Tenta carregar. Se falhar, tenta de novo em 2 segundos
  mainWindow.loadURL('http://localhost:3004').catch(() => {
    setTimeout(() => {
      if (mainWindow) mainWindow.loadURL('http://localhost:3004');
    }, 2000);
  });

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
    console.log(`Server: ${data}`);
  });

  serverProcess.stderr.on('data', (data) => {
    console.error(`Server Error: ${data}`);
  });
}

app.on('ready', () => {
  startServer();
  // Espera o servidor subir antes de criar a janela
  setTimeout(createWindow, 2500);
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