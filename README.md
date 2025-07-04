online demo: https://mbstudio.cn/mbwebphone-demo/ .

using freeswitch docker:
```
#docker pull safarov/freeswitch
#docker run -d --name fs -v  ~/fscfg:/etc/freeswitch --net=host safarov/freeswitch
#docker run -d --name ice --network=host coturn/coturn

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

package mbwebphone as an Windows/Linux/MacOS app/exe:
#npm install nwjs-builder-phoenix --save-dev
#npm run dev
#npm run dist