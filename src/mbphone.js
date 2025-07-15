var server = {
  domain: '',   //172.21.2.210
  sipPort: 8060,
  // wsServers: 'wss://172.21.2.210:7443', //wss for https://, http://
  wsServers: '',  //ws://172.21.2.210:5066 ws for http://, only localhost work, or set chrome://flags#unsafely-treat-insecure-origin-as-secure=http://ip:port
  // stunServer: '' //stun:172.21.2.210:3478
};

//default user
var user = {
    disName: '',
    name: '',
    authName: '',
    authPwd: '',
    regExpires: 180,
}
var lastCallee = '';

const VERSION = "MBWebPhone V1.3.1"
function showVersion(){
  //show electron about or failed to js alert
  try{
    window.phone.showVer();
  }catch(e){
    alert(VERSION);
  }    
}

const views = {
  'selfView':   document.getElementById('local-video'),
  'remoteView': document.getElementById('remote-video')
};

const vDiv = document.getElementById('vdiv');;
const lvDiv = document.getElementById('lvdiv');
const eMsgCheck = document.getElementById('eMsg');
const calleeInput = document.getElementById("callee");
const callBtn = document.getElementById('call');
const vcallBtn = document.getElementById('vcall');
const hangBtn = document.getElementById('hangup');
const rejectBtn = document.getElementById('reject');
const vAnsBtn = document.getElementById('vcallanswer');
const aAnsBtn = document.getElementById('callanswer');
const micBtn = document.getElementById('micctrl');
const camBtn = document.getElementById('camctrl');
const infoLb = document.getElementById('status');
const regStat = document.getElementById('regstat');
const alertMsg = document.getElementById('alertmsg');
const infoBox = document.getElementById('infobox');
const callerDiv = document.getElementById('callerdiv');
const calleeDiv = document.getElementById('calleediv');
const callctrl = document.getElementById('callctrl');

const regDiv = document.getElementById('regdiv');
const msgInput = document.getElementById('msg');
const msgBox = document.getElementById('msgbox');

var myPhone = null;
var doReReg = false;
var callSession = null;
var callTimer = null;

var deviceConfig = {audioin:'default', audioout:'default', videoin:'default'};

const videoConstraints = {
  deviceId: deviceConfig.videoin,
  width: { ideal: 1280 },
  height: { ideal: 720 },
  frameRate: { ideal: 30 },
  facingMode: "user" //"user, environment"
  // facingMode: { exact: "user" }
};

function readConfig(){
  calleeInput.value = localStorage.getItem('lastcallee');

  if(localStorage.getItem('user')){
    user = JSON.parse(localStorage.getItem('user'))
  }
  if(localStorage.getItem('server')){
    server = JSON.parse(localStorage.getItem('server'))
  }
  if(localStorage.getItem('devices')){
    deviceConfig = JSON.parse(localStorage.getItem('devices'))
    videoConstraints.deviceId = deviceConfig.videoin; //need update
  }  
  console.log("config readed:", user, server, deviceConfig);  
}

var clearCall = function(e){
  lvDiv.style.display = "none";
  views.selfView.srcObject?.getTracks().forEach(track => track.stop());
  views.selfView.srcObject = null;
  views.remoteView.srcObject?.getTracks().forEach(track => track.stop());
  views.remoteView.srcObject = null;

  console.log("call clear:");

  infoBox.style.display = "flex";
  callctrl.style.display = "none";
  callerDiv.style.display = "none";
  calleeDiv.style.display = "flex";

  infoLb.innerText = "呼叫结束";

  try{
    callSession.terminate();
    infoBox.style.display = "flex";
    callerDiv.style.display = "none";
    calleeDiv.style.display = "flex";
    callctrl.style.display = "none";    
    callSession = null;    
  }catch(e){
    callSession = null;  
    console.log('call cleard, not bad.')
  }

  if(callTimer){
    clearInterval(callTimer);
  }
};

function setupCall(incoming = false, callex, status){
  infoBox.style.display = incoming?"flex":"none";
  callctrl.style.display = incoming?"none":"flex";
  callerDiv.style.display = incoming?"flex":"none";
  calleeDiv.style.display = incoming?"none":"flex";

  infoMsg = callex + status;

  alertMsg.innerText = infoMsg;
  infoLb.innerText = infoMsg;  
}

function uaStart(){
  var uri  = new JsSIP.URI('sip', user.name, server.domain, server.sipPort);
  uri.setParam('transport', server.wsServers.split(":")[0]);  //get ws or wss
  
  var socket = new JsSIP.WebSocketInterface(server.wsServers);

  var configuration = {
    sockets  : [ socket ],
    display_name: user.disName,
    uri: uri.toAor(),
    realm: server.domain,
    contact_uri: uri.toString(),  //fix freeswtich call bugs
    authorization_user: user.authName,
    password : user.authPwd,
    register: true,
    register_expires: user.regExpires,
    connection_recovery_max_interval: 10,
    user_agent: VERSION
  };
  //https://jssip.net/documentation/api/ua_configuration_parameters/#parameter_authorization_user

  myPhone = new JsSIP.UA(configuration);

  //server state cb
  myPhone.on('connected', function(e){ 
    infoLb.innerText = "连接";
    console.log('connected');
  });
  myPhone.on('disconnected', function(e){ 
    infoMsg = `❗️ 服务器中断（${e.code}）`;
    regStat.innerText = infoMsg;
    msgInput.disabled = true;
    callBtn.disabled = true;
    vcallBtn.disabled = true;  
    console.log('disconnected');

    if(doReReg){
      console.log("do re-reg start");
      uaStart();
      doReReg = false;
    }
  });

  //register state cb
  myPhone.on('registered', function(e){ 
    msgInput.disabled = false;
    callBtn.disabled = false;
    vcallBtn.disabled = false;
    console.log('registered', e);

    infoMsg = "🟩 " + user.name +" 在线";
    document.title = infoMsg;
    regStat.innerText = infoMsg;    
  });
  myPhone.on('unregistered', function(e){ 
    infoMsg = "🟥 " + user.name +" 离线";
    regStat.innerText = infoMsg;
    document.title = infoMsg;
    msgInput.disabled = true;
    callBtn.disabled = true;
    vcallBtn.disabled = true;
    console.log('unregistered', e);
  });
  myPhone.on('registrationFailed', function(e){ 
    infoMsg = "🟥 " + user.name + ` 注册失败（${e.cause}）`;
    regStat.innerText = infoMsg;
    document.title = infoMsg;

    msgInput.disabled = true;
    callBtn.disabled = true;
    vcallBtn.disabled = true;
    console.log('registrationFailed', e);
  });

  //call process cb
  myPhone.on('newRTCSession', function(e){ 
    var callReq = e.request;

    console.log('new session:', e.session);
    callSession = e.session;

    //fix call,answer too slow problem
    callSession.on("icecandidate", function (e) {
      if ( typeof e.candidate === "object" &&         
          typeof e.candidate.type === "string" && 
          ["srflx", "rely"].includes(e.candidate.type))
        e.ready();
      console.log("icecandidate:", e);
    });

    callSession.on('ended', clearCall);
    callSession.on('failed', clearCall);

    if(callSession.direction == 'outgoing'){
      var peerConnection = callSession.connection;
      console.log('dial out');      
      showRemoteStreams(peerConnection);
    }else if(callSession.direction == 'incoming'){
      console.log('call in', e.request.from);           
      callSession.on('peerconnection', function(data){ 
        console.log('peerconnection:', data.peerconnection);
        data.peerconnection.onconnectionstatechange = (ev) => {
          switch (data.peerconnection.connectionState) {
            case "connected":              
              views.selfView.srcObject = callSession.connection.getLocalStreams()[0];
              if(views.selfView.srcObject.getVideoTracks().length > 0){
                lvDiv.style.display = "flex";
              }
              console.log(callSession.connection.getLocalStreams());
              break;

            default:
              console.log(data.peerconnection.connectionState, ev);
              break;
          }
        };      
        showRemoteStreams(data.peerconnection);
      });

      var callex = callReq.from._uri._user;
      //show incoming call video answer btn?
      vAnsBtn.hidden = (callReq.body.search("m=video")>0)?false:true;
      setupCall(true, callex, "来电");
      
      try{
        window.phone.showMe();
      }catch(e){
        console.log("not in electron", e);
      }

      try{
        const nwWin = nw?.Window?.get();
        //display nwjs window
        nwWin.show(true);
        nwWin.requestAttention(2);
      }catch(e){
        console.log("not in nwjs", e);
      }
    }
  });

  myPhone.on('newMessage', function(e){
    var now = new Date();
    var msgTime = now.getHours()+":"+now.getMinutes()+":"+now.getSeconds();

    console.log("new message:", e);
    if(e.originator == 'remote'){
      msgBox.value += e.request.from.uri.user + "(" + msgTime + "):\r\n";
      msgBox.value += e.request.body + "\r\n\r\n";
    }else{
      msgBox.value += "我"+ "(" + msgTime + "):\r\n";;
      msgBox.value += e.request.body + "\r\n\r\n";
    }
    msgBox.scrollTop = msgBox.scrollHeight;
  })

  //start sip ua
  myPhone.start();  
  infoLb.innerText = "♾️ " + server.domain+" 注册中..";
}

//call process func and cb
function showRemoteStreams(callConn) {
  //https://developer.mozilla.org/zh-CN/docs/Web/API/RTCPeerConnection/track_event
  callConn.ontrack = function(e){
    console.log("remote streams", e.streams);
    var remotestream = e.streams[0];
    views.remoteView.srcObject = remotestream;

    var tracks = remotestream.getVideoTracks();
    if(tracks.length == 0 || tracks[0].muted){
      //remote audio only
      vDiv.style.backgroundImage = 'url(img/mic.svg)';
      vDiv.style.backgroundRepeat = 'no-repeat';
      vDiv.style.backgroundPosition = 'center';
    }
  }
}

function timeFromNow() {
  const now = new Date();
  const start = new Date(callSession.start_time);
  const diff = (now - start)/1000;
  
  return Math.floor(diff / 3600).toString().padStart(2, '0') + ":" +
          Math.floor((diff % 3600) / 60).toString().padStart(2, '0') + ":" +
          Math.floor(diff % 60).toString().padStart(2, '0');
}

var answerOptions = {
  // 'mediaConstraints': {'audio': {deviceId: deviceConfig.audioin}, 'video': videoConstraints},//video flag set by checkbox latter
  // 'pcConfig': {
  //   'iceServers': [{urls: server.stunServer}]
  // }
};

var callOptions = {
  'eventHandlers': {
    'progress':   function(data){       
      setupCall(false, lastCallee, "振铃中");      
      console.log("ringing", data);
    },
    'failed':     function(data){ 
      infoLb.innerText = "呼叫失败:"+data.cause;
      console.log("call failed", data);
    },
    'sending': function(data){
      console.log('invite ready to send', data.request);
    },
    'accepted':  function(data){ 
      setupCall(false, lastCallee, "呼叫接通");
      console.log("call accepted", data);

      callTimer = setInterval(() => {
        infoLb.innerHTML = `📳 与${lastCallee}通话中 ` + timeFromNow();        
      }, 1000);
    },
    'confirmed': function(data){
      console.log("call confirmed", data);
    },
    'getusermediafailed': function(data){
      console.log("get usermedia failed", data);
    },
    'ended':      function(data){ 
      clearCall();            
      console.log("call ended", data);
    }
  },
  // 'mediaConstraints': {'audio': {deviceId: deviceConfig.audioin}, 'video': videoConstraints},  //video flag set by checkbox latter
  // 'pcConfig': {
  //     'iceServers': [{urls: server.stunServer}]
  // },
  sessionTimersExpires: 120  //freeswitch过短会呼叫失败
};

function getLocalStream(videocall, setStream, failedCb){
  if(!navigator.mediaDevices){
    alert("浏览器无法打开音视频设备，请以https://或file://方式访问。");
    infoLb.innerText = '无法打开设备，无法呼叫';
    return;
  }

  navigator.permissions.query({ name: 'microphone' }).then(function(permissionStatus){
    if(permissionStatus.state == "denied"){
      alert("没有麦克风设备或未授权访问权限，通话异常。");
    }
    console.log(permissionStatus);
  });
  // navigator.permissions.query({ name: 'camera' }).then(function(permissionStatus){
  //   if(permissionStatus.state == "denied"){
  //     alert("未授权摄像头访问权限，视频通话异常。")
  //   }
  //   console.log(permissionStatus);
  // });  

  // navigator.mediaDevices?.enumerateDevices()
  // .then(devices => {
  //   devices.forEach(device => {
  //     console.log(`${device.kind}: ${device.label} (ID: ${device.deviceId})`);
  //   });
  // });  

  var getVideo = false;
  if(videocall){
    getVideo = videoConstraints;
  }
  console.log("video constraints:", getVideo);

  if(getVideo?.deviceId === "desktop"){
    //share screen
    navigator.mediaDevices.getDisplayMedia({
      audio: {
        suppressLocalAudioPlayback: true,
      },
      systemAudio: "include",
      selfBrowserSurface: "exclude",
      surfaceSwitching: "include",
      monitorTypeSurfaces: "include",
      preferCurrentTab: false,
      video: {
        displaySurface: "window",
      }
    })
    .then(stream => {
      setStream(stream);
    }).catch(error => {
      failedCb();
      infoLb.innerText = "屏幕分享失败:"+error.name;
      console.error('媒体访问失败:', error.name); 
    }); 
  }else{
    navigator.mediaDevices.getUserMedia({
      audio: {deviceId: deviceConfig.audioin},
      video: getVideo
    })
    .then(stream => {
      setStream(stream);
    })
    .catch(error => {
      failedCb();
      infoLb.innerText = " 本地通话设备异常:"+error.name;
      console.error('媒体访问失败:', error.name); 
    }); 
  }
}

function doReg(){
  //jssip ua stop need wait disconnected msg
  if(myPhone){
    //do re-reg in disconnected cb
    console.log("need re-reg");
    doReReg = true;
    //stop after do-re-reg flag set
    myPhone?.stop();
  }else{    
    console.log("do reg");
    uaStart();
  }
}

function callOrAnswer(videocall = true){
  camBtn.style.filter = "";
  micBtn.style.filter = "";

  if(callSession && callSession.direction == 'incoming'){      
    getLocalStream(videocall, function(localStream){
      lvDiv.style.display = videocall?"flex":"none";
      camBtn.hidden = videocall?false:true;
      views.selfView.srcObject = localStream; 

      answerOptions.mediaStream = localStream;
      callSession.answer(answerOptions);  //using default device to answer
      console.log("answer option:", answerOptions);

      setupCall(false, calleeInput.value, "应答接通");
            
      callTimer = setInterval(() => {
        infoLb.innerText = "通话时长 "+ timeFromNow();
      }, 1000);
    }, function(){
      callSession.terminate();
    });    
  }else{
    lastCallee = calleeInput.value.trim();
    if(lastCallee.length < 1) return;
    
    getLocalStream(videocall, function(localStream){
      lvDiv.style.display = videocall?"flex":"none";
      camBtn.hidden = videocall?false:true;
      views.selfView.srcObject = localStream; 

      callOptions.mediaStream = localStream;  //U can choose different device to callout
      console.log(callOptions);

      var uri  = new JsSIP.URI('sip', lastCallee, server.domain, server.sipPort);
      callSession =  myPhone.call(uri.toAor(), callOptions);
      console.log('dial out:', lastCallee);
      infoLb.innerText = "呼叫中...";      
    }, function(){
      callSession?.terminate();
    });
  }  
}

//ui click cb
vcallBtn.addEventListener('click', function(){
  vDiv.style.backgroundImage = 'url(img/cam.svg)';
  vDiv.style.backgroundRepeat = 'no-repeat';
  vDiv.style.backgroundPosition = 'center';
  callOrAnswer(true);
})

callBtn.addEventListener('click', function(){   
  vDiv.style.backgroundImage = 'url(img/mic.svg)';
  vDiv.style.backgroundRepeat = 'no-repeat';
  vDiv.style.backgroundPosition = 'center';
  callOrAnswer(false);  
});

vAnsBtn.addEventListener('click', function(){
  vcallBtn.click();
})
aAnsBtn.onclick = ()=>{
  callBtn.click();
}

var msgOptions = {
  'eventHandlers': {
    'succeeded': function(data){ 
      console.log("send msg:", data);  
    },
    'failed':    function(data){ 
      console.log("send msg error:", data);
    }
  }
};

msgInput.addEventListener('keydown', function(event) {
  if (event.key === "Enter") { // 检查是否按下了回车键
    event.preventDefault(); // 阻止默认行为，例如表单提交

    var callee = calleeInput.value.trim();
    var newmsg = msgInput.value.trim();
    lastCallee = callee;
    if(lastCallee.length < 1) return;

    if(newmsg.length > 0){
      var uri  = new JsSIP.URI('sip', lastCallee, server.domain, server.sipPort);
      myPhone.sendMessage(uri.toAor(), newmsg, msgOptions);

      msgInput.value = "";
    }
  }
});

hangBtn.addEventListener('click', function(){
  clearCall();
});

rejectBtn.onclick = function(){
  hangBtn.click();
};

micBtn.onclick = function(){
  var muteS = callSession?.isMuted();
  console.log(muteS);
  if(muteS.audio){
    callSession.unmute({audio: true});
    micBtn.style.filter = "";
  }else{
    callSession.mute({audio: true});
    micBtn.style.filter = "grayscale(100%)";
  }
}

camBtn.onclick = function(){
  var muteS = callSession?.isMuted();
  console.log(muteS);
  if(muteS.video){
    callSession.unmute({video: true});
    camBtn.style.filter = "";
  }else{
    callSession.mute({video: true});
    lvDiv.style.backgroundImage = 'url(img/mic.svg)';
    camBtn.style.filter = "grayscale(100%)";
  }
}

eMsgCheck.addEventListener('change', function(e){
  msgInput.hidden = !eMsgCheck.checked;
  msgBox.hidden = !eMsgCheck.checked;
})

window.addEventListener("load", function(e){
  readConfig();
  if(server.domain.length > 3){
    doReg();
  }
})

window.addEventListener("beforeunload", function (e) {
  console.log('ready to close?')
  localStorage.setItem('lastcallee', lastCallee);
  myPhone?.unregister();
  callSession?.terminate();
  myPhone?.stop();
});