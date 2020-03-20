# no longer maintained #
I'm glad that this code helped a lot of other people to sync their not-homekit devices with HomeKit platfrom. Unfortunatelly for a time being I need to drop support of this code. You can still Fork it to your repos and based on it fix/adapt it to the current requirements.
Cheers!



#About
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
            "debuglogging": 0,
            "polling": true,
            "pollInterval": 15000,
            "riscoUsername": "",
            "riscoPassword": "",
            "riscoSiteId": 12345,
            "riscoPIN": "",
            "armCommand": "armed",
            "partialCommand": "partially",
            "homeCommand": "partially"
            "disarmCommand": "disarmed",
            "riscoPartMode": false,
            "riscoPartId": 0            
        }
    ]
```

Fields: 

* "accessory": Must always be "RiscoAlarm" (required)
* "name": Can be anything (used in logs)
* "debuglogging" , 0: levels as follows 0 = state logging, 1 = some debug logging, 2 = all debug logging
* "riscoUsername" , "riscoPassword": UserName and Password for you Web interface to RiscoCloud
* "riscoSiteId": This is your siteId to login.
* "riscoPIN": PIN Code used for arm/disarm
* "polling": optionally poll for latest RiscoCloud status
* "pollInterval": time in ms for polling
* "armCommand": partitions that should be armed
* "partialCommand": partitions that should be partially armed
* "homeCommand": partitions that should be partially armed
* "disarmCommand": partitions that should be disarmed
* "riscoPartMode": false by default. Set to true if you want to manage one or more partitions independently.
* "riscoPartId": 0 by default. Used when riscoPartMode is active. (0 => 1st Zone/Partition, 1 => 2nd Zone/Partition,...)

To get your riscoSiteId, login to riscocloud via ChromeBrowser (first login screen), and before providing your PIN (second login page), display source of the page and find string: `<div class="site-name"` ... it will look like:

`<div class="site-name" id="site_12345_div">`

In that case "12345" is your siteId which should be placed in new config file.



When set partitions for arm/disarm please use below schema (when "riscoPartMode" is set to false):
For all partitions actions use default "armed" and "disarmed" , for single partition use
"1:armed" and "1:disarmed"


