const server = {
  domain: '172.21.2.210',
  wsServers: 'wss://172.21.2.210:7443',
  // wsServers: 'ws://172.21.2.210:5066',  //only chrome://flags#unsafely-treat-insecure-origin-as-secure=true
  stunServer: 'stun:172.21.2.210:3478'
};

//default user
const user = {
    disName: '1000',
    name: '1000',
    authName: '1000',
    authPwd: 'mbstudio',
    regExpires: 180
}

const views = {
  'selfView':   document.getElementById('local-video'),
  'remoteView': document.getElementById('remote-video')
};

const vdiv = document.getElementById('vdiv');
const vCallCheck = document.getElementById('vCall');
const calleeInput = document.getElementById("callee");
const unameInput = document.getElementById("uname");
const upwdInput = document.getElementById("upwd");
const regBtn = document.getElementById('reg');
const callBtn = document.getElementById('call');
const hangBtn = document.getElementById('hangup');
const infoLb = document.getElementById('status');

var socket = new JsSIP.WebSocketInterface(server.wsServers);
var myPhone = null;
var callSession = null;
var remoteStream  = null;

const videoConstraints = {
  width: { ideal: 1280 },
  height: { ideal: 720 },
  frameRate: { ideal: 30 },
  // facingMode: { exact: "user" }
};

function uaStart(){
  var configuration = {
    sockets  : [ socket ],
    display_name: user.disName,
    uri      : 'sip:'+user.name+'@'+server.domain,
    realm: server.domain,
    // contact_uri: 'sip:'+user.name+'@'+server.domain,
    authorization_user: user.authName,
    password : user.authPwd,
    register_expires: user.regExpires,
    user_agent: 'MBWebPhone 1.0'
  };
  //https://jssip.net/documentation/api/ua_configuration_parameters/#parameter_authorization_user

  myPhone = new JsSIP.UA(configuration);

  //server state cb
  myPhone.on('connected', function(e){ 
    infoLb.innerText = "服务器已连接，等待注册";
    console.log('connected');
  });
  myPhone.on('disconnected', function(e){ 
    infoLb.innerText = "服务器中断:"+e.code;
    callBtn.disabled = true;
    regBtn.disabled = false;
    console.log('disconnected');
  });

  //register state cb
  myPhone.on('registered', function(e){ 
    infoLb.innerText = "注册在线";
    callBtn.disabled = false;
    regBtn.disabled = true;
    console.log('registered', e);
  });
  myPhone.on('unregistered', function(e){ 
    infoLb.innerText = "注册离线";
    callBtn.disabled = true;
    regBtn.disabled = false;
    console.log('unregistered', e);
  });
  myPhone.on('registrationFailed', function(e){ 
    infoLb.innerText = "注册失败:"+e.cause;
    callBtn.disabled = true;
    regBtn.disabled = false;
    console.log('registrationFailed', e);
  });

  //call process cb
  myPhone.on('newRTCSession', function(e){ 
    var callReq = e.request;
    var clearCall = function(e){
      console.log("call clear:"+e.cause);
      infoLb.innerText = "挂断"+e.cause;
      callSession = null;
      callBtn.disabled = false;
      hangBtn.disabled = true;
    };

    callSession?.termiate();  
    console.log('new session:', e.session);
    callSession = e.session;

    callSession.on("icecandidate", function (e) {
      if ( typeof e.candidate === "object" &&         
          typeof e.candidate.type === "string" && 
          ["srflx", "rely"].includes(e.candidate.type))
        e.ready();
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
              console.log(callSession.connection.getLocalStreams());
              break;

            default:
              console.log(data.peerconnection.connectionState, ev);
              break;
          }
        };      
        showRemoteStreams(data.peerconnection);
      });

      infoLb.innerText = "("+callReq.from.display_name+")"+callReq.from._uri._user+"来电";
      callBtn.disabled = false;
      hangBtn.disabled = false;
    }
  });

  //start sip ua
  myPhone.start();  
}

//call process func and cb
function showRemoteStreams(callConn) {
  //https://developer.mozilla.org/zh-CN/docs/Web/API/RTCPeerConnection/track_event
  callConn.ontrack = function(e){
    console.log("remote streams", e.streams);
    views.remoteView.srcObject = e.streams[0];
  }
}

var answerOptions = {
  'mediaConstraints': {'audio': true, 'video': videoConstraints},//video flag set by checkbox latter
  // 'pcConfig': {
  //   'iceServers': [{urls: server.stunServer}]
  // }
};

var callOptions = {
  'eventHandlers': {
    'progress':   function(data){ 
      infoLb.innerText = "振铃中";
      hangBtn.disabled = false;
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
      infoLb.innerText = "呼叫接通"; 
      console.log("call accepted", data);
    },
    'confirmed': function(data){
      console.log("call confirmed", data);
    },
    'getusermediafailed': function(data){
      console.log("get usermedia failed", data);
    },
    'ended':      function(data){ 
      views.selfView.srcObject?.getTracks().forEach(track => track.stop());
      views.remoteView.srcObject?.getTracks().forEach(track => track.stop());
      infoLb.innerText = "呼叫结束";
      callBtn.disabled = false;
      hangBtn.disabled = true;
      remoteStream  = null;
      callSession = null;
      console.log("call ended", data);
    }
  },
  'mediaConstraints': {'audio': true, 'video': videoConstraints},  //video flag set by checkbox latter
  // 'pcConfig': {
  //     'iceServers': [{urls: server.stunServer}]
  // },
  sessionTimersExpires: 120  //freeswitch过短会呼叫失败
};

function getLocalStream(setStream){
  if(!navigator.mediaDevices){
    alert("浏览器无法打开音视频设备，请以https://或file://方式访问。");
    infoLb.innerText = '无法打开设备，无法呼叫';
    return;
  }

  navigator.mediaDevices?.enumerateDevices()
  .then(devices => {
    devices.forEach(device => {
      console.log(`${device.kind}: ${device.label} (ID: ${device.deviceId})`);
    });
  });

  navigator.mediaDevices.getUserMedia({
    audio: true,
    video: vCallCheck.checked
  })
  .then(stream => {
    setStream(stream);
  })
  .catch(error => {
    infoLb.innerText = " 本地通话设备异常";
    console.error('媒体访问失败:', error.name); 
  });  

  //share screen
  // navigator.mediaDevices.getDisplayMedia({
  //   audio: {
  //     suppressLocalAudioPlayback: false,
  //   },
  //   systemAudio: "include",
  //   video: true,
  // })
  // .then(stream => {
  //   setStream(stream);
  // }).catch(error => {
  //   infoLb.innerText = "屏幕分享失败";
  //   console.error('媒体访问失败:', error.name); 
  // }); 
}

//ui click cb
regBtn.addEventListener('click', function(){
  user.disName = unameInput.value;
  user.name = unameInput.value;
  user.authName = unameInput.value;
  user.password = upwdInput.value;

  uaStart();
  regBtn.disabled = true;
});

callBtn.addEventListener('click', function(){
  if(callSession && callSession.direction == 'incoming'){        
    callSession.answer(answerOptions);  //using default device to answer
    console.log("answer option:", answerOptions);

    infoLb.innerText = "应答接通";
  }else{
    callee = calleeInput.value;
    getLocalStream(function(localStream){
      views.selfView.srcObject = localStream; 
      callOptions.mediaStream = localStream;  //U can choose different device to callout
      console.log(callOptions);

      callSession =  myPhone.call('sip:'+callee+'@'+server.domain, callOptions);
      console.log('dial out:', callee);
      infoLb.innerText = "呼叫中...";
      callBtn.disabled = true;
    });
  }
});

hangBtn.addEventListener('click', function(){
  if(callSession){
    callSession.terminate();
    infoLb.innerText = "主动挂断";
  }
});

vCallCheck.addEventListener('change', function(e){
  if(vCallCheck.checked){
    callOptions.mediaConstraints.video = videoConstraints;
    answerOptions.mediaConstraints.video = videoConstraints;
  }else{
    callOptions.mediaConstraints.video = false;
    answerOptions.mediaConstraints.video = false;
  }
});