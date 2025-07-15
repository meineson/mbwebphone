online web demo(old version): https://mbstudio.cn/mbwebphone .

![all in one](https://private-user-images.githubusercontent.com/47816990/465971441-4ee2a68c-6a0f-49f7-be7a-fa50947989fb.png?jwt=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJnaXRodWIuY29tIiwiYXVkIjoicmF3LmdpdGh1YnVzZXJjb250ZW50LmNvbSIsImtleSI6ImtleTUiLCJleHAiOjE3NTI1NjMwMzEsIm5iZiI6MTc1MjU2MjczMSwicGF0aCI6Ii80NzgxNjk5MC80NjU5NzE0NDEtNGVlMmE2OGMtNmEwZi00OWY3LWJlN2EtZmE1MDk0Nzk4OWZiLnBuZz9YLUFtei1BbGdvcml0aG09QVdTNC1ITUFDLVNIQTI1NiZYLUFtei1DcmVkZW50aWFsPUFLSUFWQ09EWUxTQTUzUFFLNFpBJTJGMjAyNTA3MTUlMkZ1cy1lYXN0LTElMkZzMyUyRmF3czRfcmVxdWVzdCZYLUFtei1EYXRlPTIwMjUwNzE1VDA2NTg1MVomWC1BbXotRXhwaXJlcz0zMDAmWC1BbXotU2lnbmF0dXJlPTI0YjZlODFhNzJiMmFiY2M1NzA3MTQ1NThmZDFlMDgzNjYxOTAyYWZlZGRkOWY5OGJkODcxZGQyMzRiNzQwOTkmWC1BbXotU2lnbmVkSGVhZGVycz1ob3N0In0.ELkBhx_H_DbeL5rUu-i2EMU8zEkfCMikfoAxNzJAseU)

__freeswitch server(docker):__
```
#docker pull safarov/freeswitch
#docker run -d --name fs -v  ~/fscfg:/etc/freeswitch --net=host safarov/freeswitch
~~#docker run -d --name ice --network=host coturn/coturn~~  

#cd ~/fscfg/
#nano vars.xml
<X-PRE-PROCESS cmd="set" data="default_password=mbstudio"/>
<X-PRE-PROCESS cmd="set" data="domain=172.21.2.210"/>   #using your fs server ip or domain
<X-PRE-PROCESS cmd="stun-set" data="external_rtp_ip=172.21.2.210"/>
<X-PRE-PROCESS cmd="stun-set" data="external_sip_ip=172.21.2.210"/> 

#nano sip_profiles/internal.xml
<param name="ext-rtp-ip" value="$${external_rtp_ip}""/>
<param name="ext-sip-ip" value="$${external_sip_ip}""/>

#nano autoload_configs/switch.conf.xml
<!-- RTP port range -->
<param name="rtp-start-port" value="8000"/> #using your fs server udp port range
<param name="rtp-end-port" value="8100"/>

#nano autoload_configs/acl.conf.xml 
<list name="wan.auto" default="allow">
  <node type="allow" cidr="172.21.0.0/16"/>  #fix coturn 488 error, using your LAN ip range
</list>   

#nano autoload_configs/event_socket.conf.xml  
    <param name="listen-ip" value="0.0.0.0"/>   #fix fs_cli.c:1699 main() Error Connecting []  

#docker restart fs
#docker exec -ti fs fs_cli
fs>sofia global siptrace on   #sip message debug
```

__WEB release__
`npm run web`

send dist/mbwebphone.tgz to users:
```
#tar zxvf mbwebphone.tgz
#node miniweb.js
```
visit http://localhost:3000 in chrome,edge,safari.
> always use ws://172.21.2.210:5066 in localhost.

__Windows/Linux/MacOS release__

package mbwebphone as an Windows/Linux/MacOS app|exe:
```
#npm install yarn
#yarn config set electron_mirror "https://npmmirror.com/mirrors/electron/"
#yarn add electron-builder -g --verbose

#npm run start  #dev
#npm run dist   #make all release
```

- windows exe
```
#npm run win   #make windows portable exe
#npx electron-builder -w nsis   #make windows installer exe
```
send dist/mbwebphone Setup 1.3.1.exe or dist/mbwebphone 1.3.1.exe to users.

- macos dmg
```
#npm run mac
```
send dist/mbwebphone-1.3.1.dmg to users.

-  linux deb
```
npm run lin
```
send dist/mbwebphone_1.3.1_amd64.deb to users.

- other OS or CPU?
```
npx electron-builder -w nsis -l rpm -m dmg --arm64 --ia32
```
how to build rpm, msi, pkg, snap, etc., see: 
https://www.electron.build/mac
https://www.electron.build/win
https://www.electron.build/linux

__Freeswitch DEMO__

- call `1000-1019` to start p2p audio/video call.
- call `9196` to start audio/video loopback echo test.
- call `3500-3599` to start video conference (up to 100 rooms).

all these defined on sip server in fscfg/dialplan/default.xml.