This is plugin that integrate Homebridge with Risco Cloud Alarm Security System.
Integration works only when proper Ethernet module is added to your Risco Unit and you are able to arm & disarm your system via https://www.riscocloud.com/ELAS/WebUI.

For now there are only 2 working states (ARM / DISARM), where ARM is common for all HomeKit states (AWAY, NIGHT, AT HOME).
If more than 0 Partitions (Zones) are armed, Plugin reports that as system is ARMED.
HomeKit looks globally, cannot distinguish difference between multiple Zones armed / disarmed.

When Polling option is enabled, Alarm state is refreshed in background, that means when you open HomeApp - there is no delay to display RiscoAlarm status. It's retreived from cached value.

# Installation

1. Install homebridge using: npm install -g homebridge
2. Install this plugin using: npm install -g homebridge-risco-alarm
3. Update your configuration file. See sample config.json snippet below. 

# Configuration

Configuration sample:

 ```
	"accessories": [
        {
            "accessory": "RiscoAlarm",
            "name": "RiscoAlarm",
            "polling": true,
            "pollInterval": 30000,
            "riscoUsername": "",
            "riscoPassword": "",
            "riscoPIN": "",
            "armCommand": "0:armed",
            "disarmCommand": "0:disarmed"
        }
    ]
```

Fields: 

* "accessory": Must always be "RiscoAlarm" (required)
* "name": Can be anything (used in logs)
* "riscoUsername" , "riscoPassword": UserName and Password for you Web interface to RiscoCloud
* "riscoPIN": PIN Code used for arm/disarm
* "polling": optionally poll for latest RiscoCloud status
* "pollInterval": time in ms for polling
* "armCommand": partitions that should be armed
* "disarmCommand": partitions that should be disarmed

When set partitions for arm/disarm please use below schema:
For 1 partition "0:armed" and "0:disarmed" , for more:
"0:armed 1:armed 2:armed" and "0:disarmed 1:disarmed 2:disarmed"