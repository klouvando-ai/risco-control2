
const { app, BrowserWindow } = require('electron');
const path = require('path');
const { spawn } = require('child_process');

let mainWindow;
let serverProcess;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    title: "Kavin's Risco Control",
    icon: path.join(__dirname, 'icon.ico'), // Adicione um ícone se tiver
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true
    },
    autoHideMenuBar: true // Oculta o menu padrão do Windows
  });

  // Aguarda o servidor subir e carrega a URL local
  mainWindow.loadURL('http://localhost:3004');

  mainWindow.on('closed', function () {
    mainWindow = null;
  });
}

// Inicia o servidor Node.js em segundo plano
function startServer() {
  serverProcess = spawn('node', [path.join(__dirname, 'server.js')], {
    shell: true,
    env: { ...process.env, PORT: 3004 }
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
  // Pequeno delay para garantir que o express iniciou antes da janela abrir
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
