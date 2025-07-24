const { app, Tray, Menu, nativeImage, desktopCapturer, session, BrowserWindow, TouchBar } = require('electron')
const { systemPreferences, ipcMain } = require('electron')
const path = require('node:path')

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
    minWidth: 640,
    minHeight:480,
    autoHideMenuBar: true,
    webPreferences: {
      // allowRunningInsecureContent: true,
      // webSecurity: false, 
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
  return win;
}

app.whenReady().then(() => {
  checkAndApplyDeviceAccessPrivilege();

  var mainWin = createWindow();

  const icon = nativeImage.createFromPath(path.join(__dirname, 'img/tray.png'))
  var tray = new Tray(icon)
  const menuTabs = [
    {
        label:'关于',
        accelerator: "CommandOrControl+A",
        click:()=>{
          app.showAboutPanel();
        }
    },
    { label: '显示', type: 'normal' , accelerator: "CommandOrControl+D",
      click: ()=>{
        mainWin.show();
      }
    },
    { label: '隐藏', type: 'normal' , accelerator: "CommandOrControl+H",
      click: ()=>{
        mainWin.minimize(); //or hide
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
  ];
  const trayMenu = menuTabs;
  const sysMenu = [{
    label: 'MeConf',
    submenu:menuTabs
  }];
  tray.setContextMenu(Menu.buildFromTemplate(trayMenu));
  // tray.setToolTip('MeConf')
  // tray.setTitle('MeConf')
  Menu.setApplicationMenu(Menu.buildFromTemplate(sysMenu));

  ipcMain.handle('showme', () => {
    console.log("need show main window");
    mainWin.show();
  });
  ipcMain.handle("showver", () => {
    console.log("need show version");
    app.showAboutPanel();
  });
})

app.commandLine.appendSwitch('ignore-certificate-errors');

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    mainWin = createWindow()
  }
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})

