online demo: https://mbstudio.cn/mbwebphone-demo/ .

using freeswitch docker:
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
![image](https://www.mbstudio.cn/images/2025-07-07-16-22-36.png)
`#tar zcvf ./out/mbwebphone.tgz index.html jssip-3.10.0.min.js mbphone.js mbweb.css miniweb.js`

send mbwebphone.tgz to users:
```
#tar zxvf mbwebphone.tgz
#node miniweb.js
```
visit http://localhost:3000 in chrome,edge,safari.

__Windows/Linux/MacOS release__

package mbwebphone as an Windows/Linux/MacOS app|exe:
```
#npm install nwjs-builder-phoenix --save-dev
#npm run dev
#npm run dist
```

- windows 
*macos need wine to make setup exe*
./out/MBWebPhone APP 1.0.1 win x64-Setup.exe
./out/MBWebPhone APP 1.0.1 win x86-Setup.exe
or run ./out/MBWebPhone APP 1.0.1 win [x64|x86]/nw.exe

- macos dmg
![image](https://www.mbstudio.cn/images/2025-07-07-16-22-28.png)
./out/MBWebPhone APP 1.0.1 mac x64.zip
or
#hdiutil create -volname "MBWebPhone" \
  -srcfolder "./out/MBWebPhone APP 1.0.1 mac x64/MBWebPhone.app" \
  -ov -format UDZO "./out/MBWebPhone.dmg"
./out/MBWebPhone v0.1.1.dmg  

-  linux
./out/MBWebPhone APP 1.0.1 linux x64.zip
./out/MBWebPhone APP 1.0.1 linux x86.zip
or run ./out/MBWebPhone APP 1.0.1 linux [x64|x86]/MBWebPhone APP