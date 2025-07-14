const { FusesPlugin } = require('@electron-forge/plugin-fuses');
const { FuseV1Options, FuseVersion } = require('@electron/fuses');

module.exports = {
  outDir: "desired/outpath",
  packagerConfig: {
    asar: true,
    "win32": {
      "target": "nsis",
      "icon": "tray.ico",
      "publisherName": "mbstudio.cn"
    },
    "linux": {
      "target": "deb",
      "icon": "tray.png",
      "category": "Utility",
      "description": "MBWebPhone",
      "desktop": {
        "Name": "MBWebPhone",
        "Comment": "MBWebPhone",
        "Terminal": false
      }
    },
    "mac": {
      "target": "dmg",
      "icon": "logo.icns",
      "category": "public.app-category.utilities",
      "extendInfo": {
        "hardenedRuntime": true,
        "entitlements": "entitlements.mac.plist",
        "entitlementsInherit": "entitlements.mac.plist",
        "NSMicrophoneUsageDescription": "需要麦克风进行语音通话。",
        "NSCameraUsageDescription": "需要摄像头进行视频通话。",
        "NSScreenCaptureUsageDescription": "需要录制权限进行桌面分享。",
        "com.apple.security.device.audio-input": true,
        "com.apple.security.device.camera": true
      }
    }     
  },
  rebuildConfig: {},
  makers: [
    {
      name: '@electron-forge/maker-squirrel',
      config: {
        iconUrl: 'favicon.ico'
      },
    },
    {
      name: '@electron-forge/maker-zip',
      platforms: ['darwin'],
    },
    {
      name: '@electron-forge/maker-deb',
      config: {},
    },
    {
      name: '@electron-forge/maker-rpm',
      config: {},
    },
    {
      name: '@electron-forge/maker-dmg',
      config: {
        background: 'tray.png',
        format: 'ULFO'
      }
    }
  ],
  plugins: [
    {
      name: '@electron-forge/plugin-auto-unpack-natives',
      config: {},
    },
    // Fuses are used to enable/disable various Electron functionality
    // at package time, before code signing the application
    new FusesPlugin({
      version: FuseVersion.V1,
      [FuseV1Options.RunAsNode]: false,
      [FuseV1Options.EnableCookieEncryption]: true,
      [FuseV1Options.EnableNodeOptionsEnvironmentVariable]: false,
      [FuseV1Options.EnableNodeCliInspectArguments]: false,
      [FuseV1Options.EnableEmbeddedAsarIntegrityValidation]: true,
      [FuseV1Options.OnlyLoadAppFromAsar]: true,
    }),
  ],
};
