This is plugin that integrate Homebridge with Risco Cloud Alarm Security System.
Integration works only when proper Ethernet module is added to your Risco Unit and you are able to arm & disarm your system via https://www.riscocloud.com/ELAS/WebUI.

For now there are only 2 working states (ARM / DISARM), where ARM is common for all HomeKit states (AWAY, NIGHT, AT HOME).
Also, currently Plugin supports only 1 Partition (Zone), as Security Module in HomeKit looks globally, and cannot distinguish difference between multiple Zones armed / disarmed.


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
            "riscoUsername": "",
            "riscoPassword": "",
            "riscoPIN": ""
        }
    ]
```

Fields: 

* "accessory": Must always be "RiscoAlarm" (required)
* "name": Can be anything (used in logs)
* "riscoUsername" , "riscoPassword": UserName and Password for you Web interface to RiscoCloud
* "riscoPIN": PIN Code used for arm/disarm