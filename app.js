var Service, Characteristic;
var risco = require('./risco');


module.exports = function (homebridge) {
    Service = homebridge.hap.Service;
    Characteristic = homebridge.hap.Characteristic;
    homebridge.registerAccessory("homebridge-risco-alarm", "RiscoAlarm", RiscoSecuritySystemAccessory);
}

function RiscoSecuritySystemAccessory(log, config) {
    
    this.log = log;
    this.name = config["name"];
    this.riscoUsername = config["riscoUsername"];
    this.riscoPassword = config["riscoPassword"];
    this.riscoPIN = config["riscoPIN"];
    
    risco.init(this.riscoUsername, this.riscoPassword, this.riscoPIN);

    // Set initial Alarm State to disarmed
    console.log("Setting initial HomeKit state to DISARMED");
    this.readstate = Characteristic.SecuritySystemCurrentState.DISARMED; // 3

    self = this;
   
}

RiscoSecuritySystemAccessory.prototype = {

    setTargetState: function (state, callback) {
        this.log("Setting state to %s", state);
        var self = this;
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
            callback(null, state);
    
        }).catch(function (error) {
            // Most propably user not logged in. Re-login
    
            risco.login().then(function (resp) {
                //successful call
                self.log('Relogin success...');
    
                risco.arm(riscoArm).then(function (resp) {
                    self.securityService.setCharacteristic(Characteristic.SecuritySystemCurrentState, state);
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

        risco.getState().then(function (resp) {
            // Worked.

            if (resp == "0" || resp == "1" || resp == "2" || resp == "3" || resp == "4") {
                self.log("Actual state is:", resp);
                callback(null, resp);
            }

        }).catch(function (error) {
            // Most propably user not logged in. Re-login

            risco.login().then(function (resp) {
                //successful call
                self.log('Relogin success...');

                risco.getState().then(function (resp) {
                    // Worked.
                    if (resp == "0" || resp == "1" || resp == "2" || resp == "3" || resp == "4") {
                        self.log("Actual state is:", resp);
                        callback(null, resp);
                    }

                }).catch(function (error) {
                    callback("error");
                })

            }).catch(function (error) {
                callback("error");

            });

        });

    },

    getCurrentState: function (callback) {
        this.log("Getting current state");
        this.getState(callback);
    },

    getTargetState: function (callback) {
        this.log("Getting target state");
        this.getState(callback);
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

        return [this.securityService];
    }
};