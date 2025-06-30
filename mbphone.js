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

var views = {
  'selfView':   document.getElementById('local-video'),
  'remoteView': document.getElementById('remote-video')
};

function add_view(){
  callSession.connection.addEventListener('track', ({ track, streams: [stream] }) => {
    console.log('add track', track, stream);
    views.remoteView.srcObject = stream;
  });

  callSession.connection.addEventListener('addstream', function(e){
    console.log("remote stream:", e.stream);

    views.remoteView.srcObject = e.stream;
    views.selfView.srcObject = callSession.connection.getLocalStreams()[0];
  });
}

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

myPhone.on('connected', function(e){ 
  infoLb.innerText = "服务器连接";
  console.log('connected');
});
myPhone.on('disconnected', function(e){ 
  infoLb.innerText = "服务器中断";
  console.log('disconnected');
});

myPhone.on('newRTCSession', function(e){ 
  console.log('newRTCSession');
  var clearCall = function(){
    console.log("call clear");
    callSession = null;
  };

  if(callSession){
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
    console.log('call in, auto answer');
    infoLb.innerText = "来电呼叫中";
  }
});

myPhone.on('newMessage', function(e){ 
  console.log('newMessage', e);
});
myPhone.on('registered', function(e){ 
  infoLb.innerText = "注册在线";
  console.log('registered', e);
});
myPhone.on('unregistered', function(e){ 
  infoLb.innerText = "注册离线";
  console.log('unregistered');
});
myPhone.on('registrationFailed', function(e){ 
  infoLb.innerText = "注册失败";
  console.log('registrationFailed');
});

myPhone.start();

var eventHandlers = {
  'progress':   function(data){ 
    infoLb.innerText = "呼叫中...";
    console.log("calling");
   },
  'failed':     function(data){ 
    infoLb.innerText = "呼叫失败";
    console.log("call failed");
   },
  'confirmed':  function(data){ 
    infoLb.innerText = "呼叫接通";
    console.log("call confirmed", data);
   },
  'ended':      function(data){ 
    infoLb.innerText = "呼叫结束";
    console.log("call ended", data);
   }
};
var options = {
  'eventHandlers': eventHandlers,
  'mediaConstraints': {'audio': true, 'video': true},
  'pcConfig': {
    'iceServers': [{urls: 'stun:stun.l.google.com:19302'}]
  },
  sessionTimersExpires: 3600  //过短也会呼叫失败
};

const callNum = document.getElementById("callee");
const callBtn = document.getElementById('call');
const hangBtn = document.getElementById('hangup');
const infoLb = document.getElementById('status');

callBtn.addEventListener('click', function(){
  if(callSession && callSession.direction == 'incoming'){
    callSession.answer({
      'mediaConstraints': {'audio': true, 'video': true},
      'pcConfig': {
        'iceServers': [{urls: 'stun:stun.l.google.com:19302'}]
      }
    });
  }else{
    callee = callNum.value;
    callSession =  myPhone.call('sip:'+callee+'@'+server.domain, options);
    console.log('dial out:', callee);
    add_view();
  }
});

hangBtn.addEventListener('click', function(){
  if(callSession){
    callSession.terminate();
    infoLb.innerText = "挂断";
  }
})