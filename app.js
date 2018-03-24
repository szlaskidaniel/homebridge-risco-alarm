"use strict";

var Service, Characteristic;
var waitUntil = require('wait-until');
var pollingtoevent = require("polling-to-event");

var pjson = require('./package.json');
var risco = require('./risco');


module.exports = function (homebridge) {
    Service = homebridge.hap.Service;
    Characteristic = homebridge.hap.Characteristic;
    homebridge.registerAccessory("homebridge-risco-alarm", "RiscoAlarm", RiscoSecuritySystemAccessory);
}


// Default Value
var riscoCurrentState; // = 3; // Do not set default. Looks like plugin get restarted after some time. Generates false alarms.

function translateState(aState) {

    // 0 -  Characteristic.SecuritySystemTargetState.STAY_ARM:
    // 1 -  Characteristic.SecuritySystemTargetState.AWAY_ARM:
    // 2-   Characteristic.SecuritySystemTargetState.NIGHT_ARM:
    // 3 -  Characteristic.SecuritySystemTargetState.DISARM:
    var translatedSate = "UNKNOWN";

    switch (aState) {
        case Characteristic.SecuritySystemTargetState.STAY_ARM:
            translatedSate = "STAY_ARM";
            break;
        case Characteristic.SecuritySystemTargetState.NIGHT_ARM:
            translatedSate = "NIGHT_ARM";
            break;
        case Characteristic.SecuritySystemTargetState.AWAY_ARM:
            translatedSate = "AWAY_ARM";
            break;
        case Characteristic.SecuritySystemTargetState.DISARM:
            translatedSate = "DISARM"
            break;
        case 4:
            translatedSate = "ALARM"
            break;
    };

    return translatedSate
}

function RiscoSecuritySystemAccessory(log, config) {


    this.log = log;
    this.name = config["name"];
    this.riscoUsername = config["riscoUsername"];
    this.riscoPassword = config["riscoPassword"];
    this.riscoPIN = config["riscoPIN"];
    this.polling = config["polling"] || false;
    this.pollInterval = config["pollInterval"] || 30000;

    var self = this;

    risco.init(this.riscoUsername, this.riscoPassword, this.riscoPIN, this);

    // set up polling if requested
    if (self.polling) {
        self.log("Starting polling with an interval of %s ms", self.pollInterval);
        var emitter = pollingtoevent(function (done) {
            self.getRefreshState(function (err, result) {
                done(err, result);
            });
        }, {
            longpolling: true,
            interval: self.pollInterval
        });

        emitter.on("longpoll", function (state) {
            if (state) {
                self.log("New state detected: (" + state + ") -> " + translateState(state) + ". Notify!");
                self.securityService.setCharacteristic(Characteristic.SecuritySystemCurrentState, state);
            }


        });

        emitter.on("err", function (err) {
            self.log("Polling failed, error was %s", err);
        });
    }

}



RiscoSecuritySystemAccessory.prototype = {
    

    setTargetState: function (state, callback) {
        var self = this;

        self.log("Setting state to %s", translateState(state));
        var riscoArm;

        switch (state) {
            case Characteristic.SecuritySystemTargetState.STAY_ARM:
                // stayArm = 0
                riscoArm = true;
                break;
            case Characteristic.SecuritySystemTargetState.NIGHT_ARM:
                // stayArm = 2
                riscoArm = true;
                break;
            case Characteristic.SecuritySystemTargetState.AWAY_ARM:
                // stayArm = 1
                riscoArm = true;
                break;
            case Characteristic.SecuritySystemTargetState.DISARM:
                // stayArm = 3
                riscoArm = false
                break;

        };

        risco.arm(riscoArm).then(function (resp) {
            self.securityService.setCharacteristic(Characteristic.SecuritySystemCurrentState, state);
            riscoCurrentState = state;
            callback(null, state);

        }).catch(function (error) {
            // Most propably user not logged in. Re-login

            risco.login().then(function (resp) {
                //successful call
                //self.log('Relogin success...');

                risco.arm(riscoArm).then(function (resp) {
                    self.securityService.setCharacteristic(Characteristic.SecuritySystemCurrentState, state);
                    riscoCurrentState = state;
                    callback(null, state);

                }).catch(function (error) {
                    self.log(error)
                    callback("error");
                })

            }).catch(function (error) {
                self.log(error);
                callback("error");

            });
        });

    },

    getState: function (callback) {
        var self = this;
        if (riscoCurrentState)
            riscoCurrentState = undefined;

        risco.login().then(function (resp) {
            risco.getState().then(function (resp) {
                // Worked.
                if (resp == 0 || resp == 1 || resp == 2 || resp == 3 || resp == 4) {
                    self.log("Actual state is: (" + resp + ") -> ", translateState(resp));
                    riscoCurrentState = resp;
                    callback(null, resp);
                }

            }).catch(function (error) {
                self.log(error);
                callback("error");
            })

        }).catch(function (error) {
            self.log(error);
            callback("error");
        });
    },


    getCurrentState: function (callback) {
    
        var self = this;

        if (self.polling) {
            callback(null, riscoCurrentState);
        } else {
            self.log('Getting current state - delayed...');
            waitUntil()
                .interval(500)
                .times(15)
                .condition(function () {
                    return (riscoCurrentState ? true : false);
                })
                .done(function (result) {
                    // do stuff
                    self.log('Update current state to:', riscoCurrentState);
                    callback(null, riscoCurrentState);

                });
        }
    },

    getTargetState: function (callback) {
        var self = this;
        if (self.polling) {
            callback(null, riscoCurrentState);
        } else {
            self.log("Getting target state...");
            self.getState(callback);
        }
    },

    getRefreshState: function (callback) {
        var self = this;
        risco.refreshState().then(function (resp) {
            if (resp == 0 || resp == 1 || resp == 2 || resp == 3 || resp == 4) {
                riscoCurrentState = resp;
                callback(null, resp);
            } else {
                // Return last known status
                callback(null, riscoCurrentState)
            }

        }).catch(function (error) {
            //self.log('Sesion expired, relogin...');
            risco.login().then(function (resp) {
                risco.getState().then(function (resp) {
                    // Worked.
                    if (resp == 0 || resp == 1 || resp == 2 || resp == 3 || resp == 4) {
                        riscoCurrentState = resp;
                        callback(null, resp);
                    }

                }).catch(function (error) {
                    self.log(error);
                    callback("error");
                })

            }).catch(function (error) {
                self.log(error);
                callback("error");
            });

        })
    },

    identify: function (callback) {
        this.log("Identify requested!");
        callback(); // success
    },

    getServices: function () {
        this.securityService = new Service.SecuritySystem(this.name);

        this.securityService
            .getCharacteristic(Characteristic.SecuritySystemCurrentState)
            .on('get', this.getCurrentState.bind(this));


        this.securityService
            .getCharacteristic(Characteristic.SecuritySystemTargetState)
            .on('get', this.getTargetState.bind(this))
            .on('set', this.setTargetState.bind(this));


        this.infoService = new Service.AccessoryInformation();
        this.infoService
            .setCharacteristic(Characteristic.Manufacturer, "Daniel S")
            .setCharacteristic(Characteristic.Model, this.name)
            .setCharacteristic(Characteristic.SerialNumber, pjson.version);

        return [this.infoService, this.securityService];
    }
};
