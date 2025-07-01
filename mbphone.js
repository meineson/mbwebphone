const server = {
  domain: '172.21.2.210',
  wsServers: 'wss://172.21.2.210:7443',
};

const user = {
    disName: 'test 1000',
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
const callNum = document.getElementById("callee");
const callBtn = document.getElementById('call');
const hangBtn = document.getElementById('hangup');
const infoLb = document.getElementById('status');

var socket = new JsSIP.WebSocketInterface(server.wsServers);
var configuration = {
  sockets  : [ socket ],
  display_name: user.disName,
  uri      : 'sip:'+user.name+'@'+server.domain,
  // contact_uri: 'sip:'+user.name+'@'+server.domain,
  authorization_user: user.authName,
  password : user.authPwd,
  register_expires: user.regExpires,
  user_agent: 'MBWebPhone 1.0'
};
//https://jssip.net/documentation/api/ua_configuration_parameters/#parameter_authorization_user

var myPhone = new JsSIP.UA(configuration);
var callSession;

//server state cb
myPhone.on('connected', function(e){ 
  infoLb.innerText = "服务器连接";
  console.log('connected');
});
myPhone.on('disconnected', function(e){ 
  infoLb.innerText = "服务器中断:"+e.code;
  callBtn.disabled = true;
  console.log('disconnected');
});

//register state cb
myPhone.on('registered', function(e){ 
  infoLb.innerText = "注册在线";
  callBtn.disabled = false;
  console.log('registered', e);
});
myPhone.on('unregistered', function(e){ 
  infoLb.innerText = "注册离线";
  callBtn.disabled = true;
  console.log('unregistered', e);
});
myPhone.on('registrationFailed', function(e){ 
  infoLb.innerText = "注册失败:"+e.cause;
  callBtn.disabled = true;
  console.log('registrationFailed', e);
});

//call process cb
myPhone.on('newRTCSession', function(e){ 
  var callReq = e.request;

  var clearCall = function(e){
    console.log("call clear:"+e.cause);
    vdiv.style.display = "none";
    infoLb.innerText = "挂断"+e.cause;
    callSession = null;
    callBtn.disabled = false;
    hangBtn.disabled = true;
  };

  if(callSession != undefined){
    callSession.termiate();  
  }
  console.log('new session:', e.session);
  callSession = e.session;

  callSession.on('ended', clearCall);
  callSession.on('failed', clearCall);
  callSession.on('peerconnection', function(e){ 
    console.log('peerconnection:');
    add_view();
  });

  if(callSession.direction == 'outgoing'){
    console.log('dial out');
  }else if(callSession.direction == 'incoming'){
    console.log('call in', e.request.from);
    infoLb.innerText = "("+callReq.from.display_name+")"+callReq.from._uri._user+"来电";
    callBtn.disabled = false;
    hangBtn.disabled = false;
  }
});

//start sip ua
myPhone.start();

//call process func and cb
function add_view(){
  callSession.connection.addEventListener('track', ({ track, streams: [stream] }) => {
    console.log('new track', track.kind);

    if(track.kind == 'audio'){
      infoLb.innerText += " 音频";
    }
    if(track.kind == 'video'){
      console.log("add new track stream:", stream);
      infoLb.innerText += "+视频";
      views.remoteView.srcObject = stream;
      views.selfView.srcObject = callSession.connection.getLocalStreams()[0];
    }
  });

  callSession.connection.addEventListener('addstream', function(e){
    console.log("add stream:", e.stream);
    views.remoteView.srcObject = e.stream;
    views.selfView.srcObject = callSession.connection.getLocalStreams()[0];
  });
}

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
    'accepted':  function(data){ 
      infoLb.innerText = "呼叫接通"; 
      console.log("call accepted", data);
    },
    'ended':      function(data){ 
      infoLb.innerText = "呼叫结束";
      callBtn.disabled = false;
      hangBtn.disabled = true;
      console.log("call ended", data);
    }
  },
  'mediaConstraints': {'audio': true, 'video': false},
  'pcConfig': {
    'iceServers': [{urls: 'stun:stun.l.google.com:19302'}]
  },
  sessionTimersExpires: 3600  //过短也会呼叫失败
};

//ui click cb
callBtn.addEventListener('click', function(){
  vdiv.style.display = vCallCheck.checked?"flex":"none";  

  if(callSession && callSession.direction == 'incoming'){    
    callSession.answer({
      'mediaConstraints': {'audio': true, 'video': vCallCheck.checked},
      'pcConfig': {
        'iceServers': [{urls: 'stun:stun.l.google.com:19302'}]
      }
    });
    infoLb.innerText = "应答接通";
  }else{
    callee = callNum.value;
    console.log(callOptions);
    callSession =  myPhone.call('sip:'+callee+'@'+server.domain, callOptions);
    console.log('dial out:', callee);
    infoLb.innerText = "呼叫发出";
    callBtn.disabled = true;
    add_view();
  }
});

hangBtn.addEventListener('click', function(){
  if(callSession){
    callSession.terminate();
    infoLb.innerText = "主动挂断";
  }
})

vCallCheck.addEventListener('change', function(e){
  console.log(e, vCallCheck.checked);
  callOptions.mediaConstraints.video = vCallCheck.checked;
})