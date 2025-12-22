
const { app, BrowserWindow } = require('electron');
const path = require('path');
const { spawn } = require('child_process');
const fs = require('fs');

let mainWindow;
let serverProcess;

// Define onde o banco de dados ficará (Pasta AppData do usuário)
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

  // Carrega o servidor local
  mainWindow.loadURL('http://localhost:3004');

  mainWindow.on('closed', function () {
    mainWindow = null;
  });
}

function startServer() {
  // Passamos o caminho do banco via variável de ambiente para o servidor
  serverProcess = spawn('node', [path.join(__dirname, 'server.js')], {
    shell: true,
    env: { 
      ...process.env, 
      PORT: 3004,
      DB_CUSTOM_PATH: dbPath // Caminho seguro para gravação
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
