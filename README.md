online demo: https://mbstudio.cn/mbwebphone-demo/ .

using freeswitch docker:
```
#docker pull safarov/freeswitch
#docker run -d --name fs -v  ~/fscfg:/etc/freeswitch --net=host safarov/freeswitch

#cd ~/fscfg/
#nano vars.xml
<X-PRE-PROCESS cmd="set" data="default_password=mbstudio"/>
<X-PRE-PROCESS cmd="set" data="domain=172.21.2.210"/>
<X-PRE-PROCESS cmd="stun-set" data="external_rtp_ip=172.21.2.210"/>
<X-PRE-PROCESS cmd="stun-set" data="external_sip_ip=172.21.2.210"/>

#nano sip_profiles/internal.xml
<param name="ext-rtp-ip" value="172.21.2.210"/>
<param name="ext-sip-ip" value="172.21.2.210"/>

#nano autoload_configs/switch.conf.xml
<!-- RTP port range -->
<param name="rtp-start-port" value="8000"/>
<param name="rtp-end-port" value="8100"/>

#docker restart fs
#docker exec -ti fs fs_cli
fs>sofia global siptrace on   #sip message debug
```
