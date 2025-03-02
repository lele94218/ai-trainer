const { app, BrowserWindow, ipcMain, desktopCapturer, Menu, globalShortcut, dialog } = require('electron');
const path = require('path');
const fs = require('fs');
const GPTClient = require('./gptClient');

const isDev = process.env.NODE_ENV === 'development';
let mainWindow;
let settingsWindow;
let gptClient;

// Settings management
const settingsPath = path.join(app.getPath('userData'), 'settings.json');

function loadSettingsSync() {
  try {
    if (fs.existsSync(settingsPath)) {
      const data = fs.readFileSync(settingsPath, 'utf8');
      return JSON.parse(data);
    }
  } catch (error) {
    console.error('Error loading settings:', error);
  }
  return {};
}

function saveSettingsSync(settings) {
  try {
    fs.writeFileSync(settingsPath, JSON.stringify(settings, null, 2));
    return true;
  } catch (error) {
    console.error('Error saving settings:', error);
    return false;
  }
}

// Initialize GPT client with settings
function initGPTClient() {
  const settings = loadSettingsSync();
  const apiKey = settings.apiKey || process.env.OPENAI_API_KEY;
  
  if (!apiKey) {
    dialog.showErrorBox('API Key Required', 'Please set your OpenAI API key in settings');
    return false;
  }
  
  try {
    gptClient = new GPTClient(apiKey, settings.model);
    return true;
  } catch (error) {
    dialog.showErrorBox('GPT Client Error', error.message);
    return false;
  }
}

function captureScreenshot() {
  return desktopCapturer.getSources({
    types: ['screen'],
    thumbnailSize: { width: 1920, height: 1080 }
  })
  .then(sources => {
    if (sources.length > 0) {
      const dataUrl = sources[0].thumbnail.toDataURL();
      mainWindow.webContents.send('screenshot-captured', dataUrl);
      // Bring window to front when screenshot is taken
      mainWindow.show();
      return dataUrl;
    }
    return null;
  })
  .catch(error => {
    console.error('Screenshot error:', error);
    return null;
  });
}

function hideWindow() {
  mainWindow.hide();
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 800,
    height: 800,
    title: 'AI Trainer',
    vibrancy: 'under-window',
    visualEffectState: 'active',
    skipTaskbar: true,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false
    }
  });

  mainWindow.loadFile('index.html');

  // Hide dock icon when window is closed (macOS)
  mainWindow.on('close', (event) => {
    // Only prevent close if it's not a quit request
    if (!mainWindow.isQuitting) {
      event.preventDefault();
      hideWindow();
    }
  });

  // Add development features
  if (isDev) {
    // Show dev tools
    mainWindow.webContents.openDevTools();
    // Watch for changes in the main file
    require('fs').watch(path.join(__dirname, 'index.html'), (event, filename) => {
      if (event === 'change') {
        mainWindow.reload();
      }
    });
  }

  // Hide from dock immediately after creation
  if (process.platform === 'darwin') {
    app.dock.hide();
  }

  const template = [
    {
      label: 'AI Trainer',
      submenu: [
        { role: 'about' },
        { type: 'separator' },
        {
          label: 'Settings',
          accelerator: 'CommandOrControl+,',
          click: () => {
            createSettingsWindow();
          }
        },
        { type: 'separator' },
        {
          label: 'Hide',
          accelerator: 'CommandOrControl+H',
          click: hideWindow
        },
        { type: 'separator' },
        {
          label: 'Quit',
          accelerator: 'CommandOrControl+Q',
          click: () => {
            mainWindow.isQuitting = true;
            app.quit();
          }
        }
      ]
    },
    {
      label: 'Edit',
      submenu: [
        { role: 'undo' },
        { role: 'redo' },
        { type: 'separator' },
        { role: 'cut' },
        { role: 'copy' },
        { role: 'paste' },
        { role: 'delete' },
        { type: 'separator' },
        { role: 'selectAll' }
      ]
    },
    ...(isDev ? [{
      label: 'Development',
      submenu: [
        { role: 'reload' },
        { role: 'forceReload' },
        { role: 'toggleDevTools' },
        { type: 'separator' },
        {
          label: 'Reset Window Size',
          click: () => {
            mainWindow.setSize(800, 800);
            mainWindow.center();
          }
        }
      ]
    }] : [])
  ];

  Menu.setApplicationMenu(Menu.buildFromTemplate(template));
}

function createSettingsWindow() {
  settingsWindow = new BrowserWindow({
    width: 400,
    height: 600,
    title: 'Settings',
    parent: mainWindow,
    modal: true,
    show: false,
    resizable: false,
    minimizable: false,
    maximizable: false,
    skipTaskbar: true,
    backgroundColor: '#2c2c2e',
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false
    }
  });

  settingsWindow.loadFile('settings.html');
  settingsWindow.once('ready-to-show', () => {
    settingsWindow.show();
  });
}

app.whenReady().then(() => {
  // Hide dock icon at startup
  if (process.platform === 'darwin') {
    app.dock.hide();
  }
  
  createWindow();
  initGPTClient();
  
  // Register global shortcuts
  globalShortcut.register('CommandOrControl+Shift+A', () => {
    captureScreenshot();
  });
  
  globalShortcut.register('CommandOrControl+Shift+S', () => {
    mainWindow.show();
  });

  // Add quick input shortcut
  globalShortcut.register('CommandOrControl+I', () => {
    mainWindow.show();
    mainWindow.webContents.send('focus-input');
  });

  // Register scroll shortcuts
  globalShortcut.register('CommandOrControl+Shift+J', () => {
    mainWindow.webContents.send('scroll-down');
  });

  globalShortcut.register('CommandOrControl+Shift+K', () => {
    mainWindow.webContents.send('scroll-up');
  });

  // Unregister shortcuts when app is quitting
  app.on('will-quit', () => {
    globalShortcut.unregisterAll();
  });
}).catch(console.error);

// Prevent app from closing when all windows are closed
app.on('window-all-closed', (event) => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  mainWindow.show();
});

// Handle screenshot requests from renderer
ipcMain.handle('capture-screenshot', captureScreenshot);

// Handle hide request from renderer
ipcMain.handle('hide-app', hideWindow);

// Handle quit request from renderer
ipcMain.handle('quit-app', () => {
  mainWindow.isQuitting = true;
  app.quit();
});

// Handle GPT analysis request
ipcMain.handle('analyze-screenshot', async (event, { imageData, message }) => {
  if (!gptClient) {
    if (!initGPTClient()) {
      return { error: 'GPT client not initialized. Please check your API key.' };
    }
  }
  
  try {
    const analysis = await gptClient.analyzeScreenshot(imageData, message);
    return { result: analysis };
  } catch (error) {
    console.error('GPT analysis error:', error);
    return { error: error.message };
  }
});

// Handle conversation reset
ipcMain.handle('reset-conversation', () => {
  if (gptClient) {
    gptClient.resetConversation();
  }
});

// Handle settings requests
ipcMain.handle('get-settings', () => {
  return loadSettingsSync();
});

ipcMain.handle('save-settings', async (event, settings) => {
  const success = saveSettingsSync(settings);
  if (success) {
    // Reinitialize GPT client with new settings
    initGPTClient();
  }
  return success;
});

// Add new IPC handlers
ipcMain.handle('open-settings', () => {
  if (!settingsWindow) {
    createSettingsWindow();
  } else {
    settingsWindow.focus();
  }
});

ipcMain.handle('close-settings', () => {
  if (settingsWindow) {
    settingsWindow.close();
    settingsWindow = null;
  }
}); 