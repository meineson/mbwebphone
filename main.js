const { app, Tray, Menu, nativeImage, desktopCapturer, session, BrowserWindow, TouchBar } = require('electron')
const { systemPreferences, ipcMain } = require('electron')
const path = require('node:path')

// const microphone = systemPreferences.askForMediaAccess('microphone');
// const camera = systemPreferences.askForMediaAccess('camera');

async function checkAndApplyDeviceAccessPrivilege() {
  const cameraPrivilege = systemPreferences.getMediaAccessStatus('camera');
  console.log(
    `checkAndApplyDeviceAccessPrivilege before apply cameraPrivilege: ${cameraPrivilege}`
  );
  if (cameraPrivilege !== 'granted') {
    await systemPreferences.askForMediaAccess('camera');
  }
  
  const micPrivilege = systemPreferences.getMediaAccessStatus('microphone');
  console.log(
    `checkAndApplyDeviceAccessPrivilege before apply micPrivilege: ${micPrivilege}`
  );
  if (micPrivilege !== 'granted') {
    await systemPreferences.askForMediaAccess('microphone');
  }
  
  const screenPrivilege = systemPreferences.getMediaAccessStatus('screen');
  console.log(
    `checkAndApplyDeviceAccessPrivilege before apply screenPrivilege: ${screenPrivilege}`
  );

  session.defaultSession.setDisplayMediaRequestHandler((request, callback) => {
    desktopCapturer.getSources({ types: ['screen'] }).then((sources) => {
      callback({ video: sources[0], audio: 'loopback' })
    })
  }, { useSystemPicker: true })
};

const createWindow = () => {
  const win = new BrowserWindow({
    width: 1066,
    height: 600,
    autoHideMenuBar: true,
    webPreferences: {
      webSecurity: false, 
      nodeIntegration: true,
      enableRemoteModule: true, 
      contextIsolation: true, 
      preload: path.join(__dirname, './electron_pre.js'),
    }
  })

  win.on('close', (event) => {    
    event.preventDefault();    
    console.log("hide window");
    win.minimize();
  });

  win.loadFile('index.html')
  Menu.setApplicationMenu(Menu.buildFromTemplate([]))
  return win;
}

app.whenReady().then(() => {
  checkAndApplyDeviceAccessPrivilege();

  var mainWin = createWindow();

  const icon = nativeImage.createFromPath(path.join(__dirname, 'img/tray.png'))
  var tray = new Tray(icon)

  const contextMenu = Menu.buildFromTemplate([
    { label: '显示', type: 'normal' , accelerator: "CommandOrControl+D",
      click: ()=>{
        mainWin.show();
      }
    },
    { label: '隐藏', type: 'normal' , accelerator: "CommandOrControl+H",
      click: ()=>{
        mainWin.hide();
      }
    },
    { label: '重启', type: 'normal' , accelerator: "CommandOrControl+R",
      click: ()=>{
        mainWin.reload();
      }
    },
    { label: '', type: 'separator' },
    { label: '退出', type: 'normal', accelerator: "CommandOrControl+Q",
      click : ()=>{
        mainWin.destroy();
        app.quit();
    } }
  ])

  tray.setContextMenu(contextMenu)  
  tray.setToolTip('MBWebPhone 1.2.0')
  tray.setTitle('MBWebPhone')

  mainWin.setTouchBar(new TouchBar([{
    label: "MBWebPhone",    
    icon: icon,
    click: ()=>{
      mainWin.show();
    }
  }]));

  
  ipcMain.handle('showme', () => {
    console.log("need show main window");
    mainWin.show();
  })
})

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    mainWin = createWindow()
  }
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})

