const { app, BrowserWindow } = require('electron')
const path = require('path')
const { autoUpdater } = require('electron-updater')

let mainWindow

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    webPreferences: {
      nodeIntegration: false,
    },
    title: 'Bliss Shore Ayur Care',
    icon: path.join(__dirname, 'public/Blish_shore_coloured.png')
  })

  // Load the live Vercel app
  mainWindow.loadURL('https://erp-new-gold.vercel.app/')

  mainWindow.on('closed', () => {
    mainWindow = null
  })
}

app.whenReady().then(() => {
  createWindow()
  
  // Check for updates automatically
  autoUpdater.checkForUpdatesAndNotify()
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})

// Updater Events
autoUpdater.on('update-available', () => {
  console.log('Update available.')
})

autoUpdater.on('update-downloaded', () => {
  console.log('Update downloaded. Restarting app to apply...')
  autoUpdater.quitAndInstall()
})
