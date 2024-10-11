'use strict'

// import { calcLineCount } from 'diff/lib/patch/merge'
import { app, BrowserWindow, dialog, ipcMain } from 'electron'
import path from 'path'

/**
 * Set `__static` path to static files in production
 * https://simulatedgreg.gitbooks.io/electron-vue/content/en/using-static-assets.html
 */
if (process.env.NODE_ENV !== 'development') {
  global.__static = require('path').join(__dirname, '/static').replace(/\\/g, '\\\\')
}

let mainWindow
const winURL = process.env.NODE_ENV === 'development'
  ? 'http://localhost:9080'
  : `file://${__dirname}/index.html`

function createWindow () {
  /**
   * Initial window options
   * skipTaskBar, toolbar added rc 20170806
   */
  mainWindow = new BrowserWindow({
    // origin RM: 1152x864.  most common gs.statcounter.com: 1366x768 1920x1080
    height: 864,
    'min-height': 864,
    useContentSize: true,
    width: 1152,
    'min-width': 1152,
    toolbar: false,
    webPreferences: { // https://stackoverflow.com/questions/48777336/is-disabling-websecurity-on-the-electron-window-the-only-way-to-display-local-im
      webSecurity: process.env.NODE_ENV !== 'development'
    }
  })

  mainWindow.setMenu(null) // added rc 20170806
  mainWindow.loadURL(winURL)

  mainWindow.on('close', e => {
    console.log('closing pending OK...')
    const choice = dialog.showMessageBox(
      mainWindow,
      {
        type: 'question',
        buttons: ['OK', 'Cancel'],
        title: 'Quit RuedaMatic Editor?',
        message: 'Sure you want to quit now?'
      }
    )
    // index of clicked button (1 : No)
    if (choice === 1) e.preventDefault()
  })

  mainWindow.on('closed', () => {
    mainWindow = null
  })
}
// Here follows some IPC actions using node libraries for local effects that are not allowed in a browser.
// Early on, the electron way of handling non-browser local action was use Node, in the "main" process, and use IPC to control it from the "renderer".
// Now there are flags and behaviour in chromium to better support direct local action from the "renderer".
// But we'll leave the working code that follows the older convention.
console.log('main: setting up ipcMain listener for request to recycle file/folder.  For deleting a scheme.')
ipcMain.on('asynch-scheme-delete-request', (event, schemePath) => {
  console.log('debug asynch request: ' + schemePath)
  console.log('IPC receiving on channel asynch-scheme-delete-request')
  const child = require('child_process').execFile
  // source: https://www.npmjs.com/package/ffmpeg-static
  /* eslint-disable no-undef */ // for __static, from webpack
  const execPath = path.join(__static, '/recycle-bin.exe')
  /* eslint-enable no-undef */
  const params = [schemePath]

  // use FFMPEG to calculate the MD5 of the music file.  The params request
  //   the checksum to exclude the non-music parts (file tags that may change without affecting the checksum)
  child(execPath, params, (error, stdout, stderr) => {
    if (error) {
      console.log(`exec error: ${error}`)
      console.error(`exec error: ${error}`)
      dialog.showMessageBox(
        mainWindow,
        {
          type: 'question',
          buttons: ['OK'],
          title: 'Quit RuedaMatic Editor?',
          message: 'MISSING EXE: reudamatic editor requires a copy of recycle-bin.exe for windows, which we installed in folder ./static.  For help, check with developer of your distribution!'
        }
      )
    } else {
      console.log(`stdout: ${stdout}`)
      console.log(`stderr: ${stderr}`)
      console.log('IPC sending on channel asynch-scheme-delete-request')
      // ret string is like 'MD5=F123....' so split off the value
      event.sender.send('asynch-scheme-delete-result', stdout)
    }
  })
})

console.log('main: setting up ipcMain listener for request to launch ffmpeg and retrieve md5 checksum for a file')
ipcMain.on('asynch-md5-request', (event, filename) => {
  console.log('debug asynch request: ' + filename)
  console.log('IPC receiving on channel asynch-md5-request')
  const child = require('child_process').execFile
  // source: https://www.npmjs.com/package/ffmpeg-static
  console.log()
  const execPath = path.join(__static, '/ffmpegLocal.exe')
  /* eslint-enable no-undef */
  const params = ['-hide_banner', '-loglevel', 'error', '-i', filename, '-vn', '-f', 'md5', '-']

  // use FFMPEG to calculate the MD5 of the music file.  The params request
  //   the checksum to exclude the non-music parts (file tags that may change without affecting the checksum)
  child(execPath, params, (error, stdout, stderr) => {
    if (error) {
      console.log(`exec error: ${error}`)
      console.error(`exec error: ${error}`)
      dialog.showMessageBox(
        mainWindow,
        {
          type: 'question',
          buttons: ['OK'],
          title: 'Quit RuedaMatic Editor?',
          message: 'MISSING EXE: reudamatic editor requires a copy of ffmpeg for windows, which we installed in folder ./static.  For help, check with developer of your distribution!'
        }
      )
    } else {
      console.log(`stdout: ${stdout}`)
      console.log(`stderr: ${stderr}`)
      console.log('IPC sending on channel asynch-md5-result')
      // ret string is like 'MD5=F123....' so split off the value
      event.sender.send('asynch-md5-result', stdout.split('=')[1].trim())
    }
  })
})

app.on('ready', createWindow)

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

app.on('activate', () => {
  if (mainWindow === null) {
    createWindow()
  }
})

/**
 * Auto Updater
 *
 * Uncomment the following code below and install `electron-updater` to
 * support auto updating. Code Signing with a valid certificate is required.
 * https://simulatedgreg.gitbooks.io/electron-vue/content/en/using-electron-builder.html#auto-updating
 */

/*
import { autoUpdater } from 'electron-updater'

autoUpdater.on('update-downloaded', () => {
  autoUpdater.quitAndInstall()
})

app.on('ready', () => {
  if (process.env.NODE_ENV === 'production') autoUpdater.checkForUpdates()
})
 */
