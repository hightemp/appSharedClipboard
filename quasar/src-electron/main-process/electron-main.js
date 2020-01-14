import { app, BrowserWindow, nativeTheme, Menu, Tray, clipboard, ipcMain, nativeImage } from 'electron'

import dgram from 'dgram';
import path from 'path';
import moment from 'moment';
import { Server } from 'http';
import { fstat } from 'fs';

const PORT = 8787;

try {
  if (process.platform === 'win32' && nativeTheme.shouldUseDarkColors === true) {
    require('fs').unlinkSync(require('path').join(app.getPath('userData'), 'DevTools Extensions'))
  }
} catch (_) { }

/**
 * Set `__statics` path to static files in production;
 * The reason we are setting it here is that the path needs to be evaluated at runtime
 */
if (process.env.PROD) {
  global.__statics = require('path').join(__dirname, 'statics').replace(/\\/g, '\\\\')
}

let mainWindow = null;
let tray = null;
let aList = [];

function createWindow () {
  console.log('[!] createWindow');
  var sTrayIconPath = __statics+'/app-logo.png';
  
  //var sTrayIconPath = __dirname+'/assets/app-logo.png';
  //var sTrayIconPath = 'assets/app-logo.png';
  
  //var glob = require('glob');
  //glob(__dirname+'/**/*', {}, (e, f) => { f.forEach((_) => console.dir(_)) });

  console.log('[!]', sTrayIconPath, require('fs').existsSync(sTrayIconPath));

  let oNativeImage = nativeImage.createFromPath(sTrayIconPath);

  /**
   * Initial window options
   */
  mainWindow = new BrowserWindow({
    width: 1000,
    height: 600,
    useContentSize: true,
    icon: oNativeImage,
    show: false,
    webPreferences: {
      // keep in sync with /quasar.conf.js > electron > nodeIntegration
      // (where its default value is "true")
      // More info: https://quasar.dev/quasar-cli/developing-electron-apps/node-integration
      nodeIntegration: true
    }
  })

  mainWindow.hide();

  mainWindow.loadURL(process.env.APP_URL)

  mainWindow.on('minimize',function(event){
    console.log('minimize');
    event.preventDefault();
    mainWindow.hide();
  });

  mainWindow.on('close', function (event) {
    console.log('close');
    if(!app.isQuiting){
      event.preventDefault();
      mainWindow.hide();
    }

    return false;
  });

  process.once('SIGINT', () => { 
    console.log('SIGINT');
    app.isQuiting = true;
    app.quit();//
  });

  process.once('SIGTERM', () => { 
    console.log('SIGTERM');
    app.isQuiting = true;
    app.quit();
  });

  function fnToggleWindowVisibility()
  {
    mainWindow.isVisible() ? mainWindow.hide() : mainWindow.show();
  }

  tray = new Tray(oNativeImage)

  tray.on('click double-click', () => {
    fnToggleWindowVisibility();
  });

  const contextMenu = Menu.buildFromTemplate([
    {
      label: 'Show/hide',
      click: async () => {
        fnToggleWindowVisibility();
      },
    },
    { type: 'separator' },
    { 
      label: 'Quit', 
      click:  function(){
        app.isQuiting = true;
        app.quit();
      } 
    }
  ])
  tray.setToolTip('appSharedBuffer')
  tray.setContextMenu(contextMenu)

  function fnUpdateList()
  {
    mainWindow.webContents.send('clipboard-update', aList);
  }

  var oClient = dgram.createSocket("udp4");
  var bSendItem = false;
  var bRemoteClipboardChange = false;

  function fnSendItem(oItem)
  {
    console.log('fnSendItem', oItem);
    try {
      var sMessage = JSON.stringify(oItem);
      bSendItem = true;
      oClient.send(sMessage, PORT, '0.0.0.0');
    } catch(oError) {
      console.error(oError);
    }
  }

  function fnAddItem(oItem)
  {
    aList.push(oItem);
    fnSendItem(oItem);
    fnUpdateList();
  }

  const clipboardWatcher = require('electron-clipboard-watcher')
  clipboardWatcher({
    // (optional) delay in ms between polls
    watchDelay: 1000,

    // handler for when image data is copied into the clipboard
    onImageChange: function (nativeImage) { 
      if (bRemoteClipboardChange) {
        bRemoteClipboardChange = false;
        return;
      }
      console.log('onImageChange', nativeImage); 
      fnAddItem({ 
        iTime: moment().valueOf(),
        sType: 'image',
        sText: nativeImage 
      });
    },

    // handler for when text data is copied into the clipboard
    onTextChange: function (text) {
      if (bRemoteClipboardChange) {
        bRemoteClipboardChange = false;
        return;
      } 
      console.log('onTextChange', text);
      fnAddItem({ 
        iTime: moment().valueOf(),
        sType: 'text',
        sText: text 
      });
    }
  });

  function fnWriteToClipboard(oItem)
  {
    bRemoteClipboardChange = true;

    if (oItem.sType=='text') {
      clipboard.writeText(oItem.sText);
    }
  }

  ipcMain.on('delete-item', (oEvent, oItem) => {
    console.log('delete-item', oItem)
    aList = aList.filter((v) => v.iTime!=oItem.iTime );
    fnUpdateList();
  });

  ipcMain.on('copy-to-cb-item', (oEvent, oItem) => {
    console.log('copy-to-cb-item', oItem)
    
    fnWriteToClipboard(oItem);
  });

  ipcMain.on('renderer-app-created', (oEvent) => {
    console.log('renderer-app-created')
    
    fnUpdateList();
  });

  var oServer = dgram.createSocket("udp4");

  oServer.bind(PORT, '0.0.0.0');
  oServer.on('message', function(oMessage) {
    console.log('oServer message', oMessage);
    if (bSendItem) {
      bSendItem = false;
      return;
    }
    try {
      var oItem = JSON.parse(oMessage.toString());

      fnWriteToClipboard(oItem);

      aList.push(oItem);
      fnUpdateList();
    } catch (oError) {
      console.error(oError);
    }
  });

  oServer.on('listening', () => {
    console.log('listen '+oServer.address+':'+oServer.port);
  });

  fnUpdateList();
}

app.on('ready', createWindow)

// app.on('window-all-closed', e => e.preventDefault())

app.on('activate', () => {
  if (mainWindow === null) {
    createWindow()
  }
})
