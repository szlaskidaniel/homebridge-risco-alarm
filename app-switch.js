var Service, Characteristic;
//var pollingtoevent = require("polling-to-event");

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

    self = this;

    risco.init(this.riscoUsername, this.riscoPassword, this.riscoPIN);


    // polling settings
    /*
    self.polling = config.polling;
    self.pollInterval = config.pollInterval || 30000;

    // set up polling if requested
    //
    // *** POLLING DISABLED as WAS NOT RELIABLE
    //
    if (self.polling) {
        self.log("Starting polling with an interval of %s ms", self.pollInterval);
        var emitter = pollingtoevent(function (done) {

            self.getCurrentState(function (err, result) {
                done(err, result);
            });
            self.getTargetState(function (err, result) {
                done(err, result);
            });


        }, {
            longpolling: true,
            interval: self.pollInterval
        });

        emitter.on("longpoll", function (state) {
            self.log("Polling noticed status change to %s, notifying devices", state);
            self.securityService.setCharacteristic(Characteristic.SecuritySystemCurrentState, state);

        });

        emitter.on("err", function (err) {
            self.log("Polling failed, error was %s", err);
        });
    }
    */

}

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

RiscoSecuritySystemAccessory.prototype = {

    setTargetState: function (state, callback) {
        this.log("Setting state to %s", state);
        var self = this;

        risco.arm(state).then(function (resp) {

            //self.securityService.setCharacteristic(Characteristic.On, state);
            callback(null, state);

        }).catch(function (error) {
            // Most propably user not logged in. Re-login

            risco.login().then(function (resp) {
                //successful call
                self.log('Relogin success...');

                risco.arm(state).then(function (resp) {
                    //self.securityService.setCharacteristic(Characteristic.On, state);
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

        risco.login().then(function (resp) {
            //successful call
            self.log('Login success...');

            risco.getInitState().then(function (resp) {
                // Worked.
                // if (resp == 0 || resp == 1 || resp == 2 || resp == 3 || resp == 4) {
                self.log("Actual state is: " + resp);
                callback(null, resp);
                // }

            }).catch(function (error) {
                callback("error");
            })

        }).catch(function (error) {
            callback("error");
        });
    },
    /*
    getCurrentState: function (callback) {
        this.log("Getting current state");
        this.getState(callback);
    },

    getTargetState: function (callback) {
        this.log("Getting target state");
        this.getState(callback);
    },*/

    identify: function (callback) {
        this.log("Identify requested!");
        callback(); // success
    },

    getServices: function () {
        this.securityService = new Service.Switch(this.name);

        this.securityService
            .getCharacteristic(Characteristic.On)
            .on('get', this.getState.bind(this))
            .on('set', this.setTargetState.bind(this));

        return [this.securityService];
    }
};