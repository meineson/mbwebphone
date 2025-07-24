const { app, Tray, Menu, nativeImage, desktopCapturer, session, BrowserWindow, TouchBar } = require('electron')
const { TouchBarLabel, TouchBarButton, TouchBarSpacer, TouchBarScrubber, TouchBarPopover } = TouchBar
const { systemPreferences, protocol, ipcMain } = require('electron')
const path = require('node:path');
const { electron } = require('node:process');

var mainWin = null;    //electron main window
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

//macos touchbar and call duration
const infoTbl = new TouchBarLabel({ label: 'MeConf' })
const dialTbb = new TouchBarButton({
  icon: nativeImage.createFromPath(path.join(__dirname, 'img/dialpad.png')),
  click: () => {  
    mainWin.webContents.send('notification', {cmd: 'dialpad'});
  } 
})
const aCallTbb = new TouchBarButton({
  icon: nativeImage.createFromPath(path.join(__dirname, 'img/acall.png')),
  click: () => {
    mainWin.webContents.send('notification', {cmd: 'acall'});
  } 
})
const vCallTbb = new TouchBarButton({ 
  icon: nativeImage.createFromPath(path.join(__dirname, 'img/vcall.png')),
  click: () => {
    mainWin.webContents.send('notification', {cmd: 'vcall'});
  } 
})
const hangTbb = new TouchBarButton({ 
  icon: nativeImage.createFromPath(path.join(__dirname, 'img/hang.png')),
  click: () => {
    mainWin.webContents.send('notification', {cmd: 'hang'});
  } 
})
const numbBar = new TouchBarScrubber({
  items:[], //speed dial or history
  selectedStyle: "outline",
  showArrowButtons: true,
  select: (i)=>{
    console.log("select", i);
    if(i == -1) return;
    mainWin.webContents.send('notification', 
      {cmd: 'dialnum', number: numbBar.items[i].label});
  },
  // highlight: (i)=>{
  //   console.log("highlight", i);
  //   if(i == -1) return;
  //   mainWin.webContents.send('notification', 
  //     {cmd: 'dialnum', number: numbBar.items[i].label});
  // },
  mode: 'fixed'
})
const touchBar = new TouchBar({
  items: [
    infoTbl,
    // new TouchBarLabel({ label: '快速拨号:' }),
    numbBar,
    dialTbb,
    aCallTbb,
    vCallTbb,
    hangTbb
  ]
})

// 注册协议的权限
protocol.registerSchemesAsPrivileged([{
  scheme: 'call',           // 自定义的协议名，比如 app://
  privileges: {
    secure: true,          // 表示该协议是安全的，可以使用 CSP、cookies 等
    standard: true,        // 支持标准 URL 功能，比如 fetch、new URL()
    corsEnabled: true,     // 允许跨域请求(适合前端访问资源)
    supportFetchAPI: true, // 允许 fetch 使用该协议
    stream: false          // 是否需要使用流，如果用 registerStreamProtocol，改为 true
  }
}]);
// app.setAsDefaultProtocolClient('call'); //reg call:// protocal
app.on('open-url', (event, url) => {
  console.log(`Handling custom protocol: ${url}`);
  var callee = url.slice('call://'.length)
  if(callee.length > 1){
    mainWin.webContents.send('notification', 
      {cmd: 'dialnum', number: callee});
    mainWin.webContents.send('notification', {cmd: 'vcall'});
  }
});

app.whenReady().then(() => {
  checkAndApplyDeviceAccessPrivilege();

  mainWin = createWindow();
  mainWin.setTouchBar(touchBar)

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

  ipcMain.handle('showStatus', (e, data) => {
    infoTbl.label = data;
  });

  ipcMain.handle('showHistory', (e, data) => {
    console.log("show history to touchbar:", data);
    const newHis = [];
    data.forEach(item => {
      console.log("push items:", {label: item});
      newHis.push({label: item});
    })
    numbBar.items = newHis;
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

