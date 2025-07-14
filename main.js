const { app, Tray, Menu, nativeImage, desktopCapturer, session, BrowserWindow } = require('electron')
const { systemPreferences } = require('electron')

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
};


checkAndApplyDeviceAccessPrivilege();

const createWindow = () => {
  const win = new BrowserWindow({
    width: 1066,
    height: 600,
    autoHideMenuBar: true
  })

  session.defaultSession.setDisplayMediaRequestHandler((request, callback) => {
    desktopCapturer.getSources({ types: ['screen'] }).then((sources) => {
      // Grant access to the first screen found.
      callback({ video: sources[0], audio: 'loopback' })
    })
    // If true, use the system picker if available.
    // Note: this is currently experimental. If the system picker
    // is available, it will be used and the media request handler
    // will not be invoked.
  }, { useSystemPicker: true })

  win.loadFile('index.html')
  Menu.setApplicationMenu(null); 
}

app.whenReady().then(() => {
  const icon = nativeImage.createFromPath('icon.png')
  // var tray = new Tray(icon)

  // const contextMenu = Menu.buildFromTemplate([
  //   { label: '显示', type: 'normal' },
  //   { label: '重启', type: 'normal' },
  //   { label: '退出', type: 'normal' }
  // ])

  // tray.setContextMenu(contextMenu)  
  // tray.setToolTip('MBWebPhone 1.2.0')
  // tray.setTitle('MBWebPhone')

  createWindow()
  
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})