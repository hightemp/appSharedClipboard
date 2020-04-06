import { app, BrowserWindow, nativeTheme, Menu, Tray, clipboard, ipcMain, nativeImage } from 'electron'

import dgram from 'dgram';
import path from 'path';
import moment from 'moment';
import { Server } from 'http';
import { fstat } from 'fs';
import fs from 'fs';
import crc32 from 'crc/crc32';
import WebSocket from 'ws';
import os from 'os';

import fnGetAllIPsFromAllInterfaces from '../../src/lib/interfaces';

const PORT = 8787;
const WS_PORT = PORT+1;

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

var mainWindow = null;
var tray = null;
// var aList = [];
var oList = {};
var oConfig = {
  sBroadcastIP: "255.255.255.255",
  bWatchForText: true,
  bWatchForImages: true,
  // iPackedRecieveTimeout: 3000,
  // iPacketSize: 10000
};
var oRecievedPackets = {
  /*
    "deadbeaf": {
      // iStartTimestamp: 123123123,
      // iTimeout: 5000,
      iRecievedParts: 5,
      iPartsCount: 10,
      oPackets: {
        5: {
          sCRCPacket: "deadbeaf",
          sCRCItem: "deadbeaf",
          sData: "",
          iPartNumber: 5,
          iPartsCount: 10
        },
        3: {

        }
      }
    }
  */
};

function createWindow () 
{
  
  var sTrayIconPath = __statics+'/app-logo.png';

  var eNotify = require('electron-notify');

  eNotify.setConfig({
    appIcon: sTrayIconPath,
    displayTime: 6000,
  });

  var sListFilePath = app.getPath("home")+"/appSharedClipboard.list.json";
  var sConfigFilePath = app.getPath("home")+"/appSharedClipboard.config.json";
  
  // TODO: oConfig loader and saver
  function fnLoadConfig()
  {
    if (fs.existsSync(sListFilePath)) {
      try {
        oConfig = {
          ...oConfig, 
          ...JSON.parse(fs.readFileSync(sConfigFilePath).toString())
        };
        
      } catch (oError) {
        console.error(oError);
      }
    }
  }

  function fnSaveConfig()
  {
    try {
      
      fs.writeFileSync(sConfigFilePath, JSON.stringify(oConfig));
    } catch (oError) {
      console.error(oError);
    }
  }

  fnLoadConfig();

  function fnLoadList()
  {
    if (fs.existsSync(sListFilePath)) {
      try {
        oList = JSON.parse(fs.readFileSync(sListFilePath).toString());
      } catch (oError) {
        console.error(oError);
      }
    }
  }

  function fnSaveList()
  {
    try {
      fs.writeFileSync(sListFilePath, JSON.stringify(oList));
    } catch (oError) {
      console.error(oError);
    }
  }

  fnLoadList();
  
  //var sTrayIconPath = __dirname+'/assets/app-logo.png';
  //var sTrayIconPath = 'assets/app-logo.png';
  
  //var glob = require('glob');
  //glob(__dirname+'/**/*', {}, (e, f) => { f.forEach((_) => console.dir(_)) });

  

  let oNativeImage = nativeImage.createFromPath(sTrayIconPath);

  const { screen } = require("electron");
  const { width, height } = screen.getPrimaryDisplay().workAreaSize;

  /**
   * Initial window options
   */
  mainWindow = new BrowserWindow({
    width: 500,
    height: 600,
    x: width,
    y: 30,
    useContentSize: true,
    icon: oNativeImage,
    show: false,
    webPreferences: {
      // keep in sync with /quasar.conf.js > electron > nodeIntegration
      // (where its default value is "true")
      // More info: https://quasar.dev/quasar-cli/developing-electron-apps/node-integration
      nodeIntegration: true
    }
  });

  mainWindow.setMenu(null);

  mainWindow.hide();

  mainWindow.loadURL(process.env.APP_URL)

  mainWindow.on('minimize',function(event){
    
    event.preventDefault();
    mainWindow.hide();
  });

  mainWindow.on('close', function (event) {
    
    if(!app.isQuiting){
      event.preventDefault();
      mainWindow.hide();
    }

    return false;
  });

  process.once('SIGINT', () => { 
    
    app.isQuiting = true;
    app.quit();//
  });

  process.once('SIGTERM', () => { 
    
    app.isQuiting = true;
    app.quit();
  });

  function fnToggleWindowVisibility()
  {
    mainWindow.isVisible() ? 
      (mainWindow.isFocused() ? mainWindow.hide() : mainWindow.show())
      : mainWindow.show();
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
    // 
    mainWindow.webContents.send('clipboard-update', oList);
  }

  function fnUpdateConfig()
  {
    
    mainWindow.webContents.send('config-update', oConfig);
  }

  var oClient = dgram.createSocket("udp4");
  oClient.bind(function() { oClient.setBroadcast(true); });
  // var bSendItem = false;
  var bRemoteClipboardChange = false;

  function fnNotifyAll(sKey)
  {
    

    var sMessage = JSON.stringify({
      sEvent: "download-item", 
      sKey: sKey
    });

    try {
      oClient.send(
        sMessage, 
        0, 
        sMessage.length, 
        PORT, 
        oConfig.sBroadcastIP, 
        (oErr, iNumBytes) => { 
          if (oErr) {
            console.error(oErr);
          }
          
        }
      );
    } catch(oError) {
      console.error(oError);
    }
  }

  function fnAddItem(oItem)
  {
    var iTimestamp = moment().valueOf();
    oList[iTimestamp] = oItem;
    //
    //aList.push(oItem);
    fnSaveList();
    fnUpdateList();
    //fnSendItem(oItem);
    fnNotifyAll(iTimestamp);
  }

  const clipboardWatcher = require('electron-clipboard-watcher')
  clipboardWatcher({
    // (optional) delay in ms between polls
    watchDelay: 1000,

    // handler for when image data is copied into the clipboard
    onImageChange(nativeImage) { 
      
      if (!oConfig.bWatchForImages) 
        return;
      if (bRemoteClipboardChange) {
        bRemoteClipboardChange = false;
        return;
      }
       
      fnAddItem({ 
        iTime: moment().valueOf(),
        sType: 'image',
        sText: nativeImage.toDataURL()
      });
    },

    // handler for when text data is copied into the clipboard
    onTextChange(text) {
      
      if (!oConfig.bWatchForText) 
        return;
      if (bRemoteClipboardChange) {
        bRemoteClipboardChange = false;
        return;
      } 
      
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

    if (oItem.sType=='image') {
      clipboard.writeImage(nativeImage.createFromDataURL(oItem.sText));
    }
  }

  ipcMain.on('send-clipboard', (oEvent, oClipboard) => {
    oList['clipboard'] = oClipboard;
    fnSaveList();
    fnUpdateList();
    fnNotifyAll('clipboard');
  });

  ipcMain.on('send-item', (oEvent, sKey) => {
    fnNotifyAll(sKey);
  });

  ipcMain.on('delete-item', (oEvent, sKey) => {
    
    // aList = aList.filter((v) => v.iTime!=oItem.iTime );
    delete oList[sKey];
    fnSaveList();
    fnUpdateList();
  });

  ipcMain.on('clear-list', (oEvent, sKey) => {
    oList = {};
    fnSaveList();
    fnUpdateList();
  });

  ipcMain.on('copy-to-cb-item', (oEvent, sKey) => {
    
    
    var oItem = oList[sKey];
    fnWriteToClipboard(oItem);
    //fnSendItem(oItem);
  });

  ipcMain.on('renderer-app-created', (oEvent) => {
    
    
    fnUpdateConfig();
    fnUpdateList();
  });

  ipcMain.on('config-update', (oEvent, oNewConfig) => {
    
    
    oConfig = oNewConfig;
    fnSaveConfig();
  });

  var oWSS = new WebSocket.Server({ port: WS_PORT });

  // WS server, send item
  oWSS.on('connection', (oWS) => {
    
    oWS.on('message', (sMessage) => {
      
      try {
        var oMessage = JSON.parse(sMessage);

        if (oMessage.sEvent == 'ws-download-item') {
          var sItem = JSON.stringify(oList[oMessage.sKey]);
          
          oWS.send(sItem);
        }
      } catch (oError) {
        console.error(oError);
      }
    });
  });

  var oServer = dgram.createSocket("udp4");

  oServer.bind(PORT);

  // UDP Broadcast server
  oServer.on('message', function(oMessageBuffer, oInfo) {
    

    var aIPs = fnGetAllIPsFromAllInterfaces();

    if (~aIPs.indexOf(oInfo.address)) {
      return;
    }

    try {
      var oMessage = JSON.parse(oMessageBuffer.toString());

      if (oMessage.sEvent == "download-item") {
        
        var oWS = new WebSocket(`ws://${oInfo.address}:${WS_PORT}`);
        

        oWS.on('message', (sMessage) => {
          
          try {
            var oItem = JSON.parse(sMessage);

            var sKey = moment().valueOf(); //oMessage.sKey

            oList[sKey] = oItem;

            if (oItem.sType=="text") {
              eNotify.notify({ 
                title: "Copy event from "+oInfo.address, 
                text: oItem.sText.length > 30 ? oItem.sText.substr(0, 30)+'...' : oItem.sText 
              });
            }

            if (oItem.sType=="image") {
              eNotify.notify({ 
                title: "Copy event from "+oInfo.address, 
                image: oItem.sText 
              });
            }

            fnWriteToClipboard(oItem);
            fnSaveList();
            fnUpdateList();
          } catch (oError) {
            console.error(oError);
          }
        });

        

        oWS.on('error', (oError) => {
          
          console.error(oError);
        });

        

        oWS.on('open', () => {
          
          oWS.send(
            JSON.stringify(
              {
                sEvent: 'ws-download-item',
                sKey: oMessage.sKey
              }
            )
          );
        });

        
      }
    } catch (oError) {
      console.error(oError);
    }
  });

  oServer.on('listening', () => {
    oServer.setBroadcast(true);
    
  });
}

app.on('ready', createWindow)

// app.on('window-all-closed', e => e.preventDefault())

app.on('activate', () => {
  if (mainWindow === null) {
    createWindow()
  }
})
