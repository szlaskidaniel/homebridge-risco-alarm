var request = require('request');
var cookie = require('cookie');

var riscoCookies;
var risco_username;
var risco_password;
var risco_pincode;
var self;


function init(aUser, aPassword, aPIN, context) {
    risco_username = aUser;
    risco_password = aPassword;
    risco_pincode = aPIN;
    self = context;

}

function login() {

    return new Promise(function (resolve, reject) {
        //self.log('login to RiscoCloud...');

        var post_data = {
            "username": risco_username,
            "password": risco_password,
            "code": risco_pincode,
            "strRedirectToEventUID": "",
            "langId": "en"
        };

        var options = {
            url: 'https://www.riscocloud.com/ELAS/WebUI/',
            method: 'POST',
            headers: {},
            json: post_data
        };
        request(options, function (err, res, body) {
            if (!err && res.statusCode == 302) {
                //self.log('Logged In');
                riscoCookies = res.headers['set-cookie'];
                resolve();
            } else {
                var errMsg;
                if (res) {
                    try {
                        errMsg = 'error during login, HTTP ResponseCode ' + res.statusCode;    
                    } catch (error) {
                        
                    }
                    
                } else {
                    errMsg = 'error during connecting with RiscoCloud';
                }
                
                self.log(errMsg);
                reject(errMsg);
            }
        })

    });
}


function getState() {

    return new Promise(function (resolve, reject) {
        var post_data = {};

        var options = {
            url: 'https://www.riscocloud.com/ELAS/WebUI/Overview/Get',
            method: 'POST',
            headers: {
                "Referer": "https://www.riscocloud.com/ELAS/WebUI/MainPage/MainPage",
                "Origin": "https://www.riscocloud.com",
                "Cookie": riscoCookies
            },
            json: post_data
        };
        request(options, function (err, res, body) {
            if (!err) {
                // Check error inside JSON
                try {
                    if (body.error == 3) {
                        // Error. Try to login first
                        //self.log('Error: 3. Try to login first.');
                        reject();
                        return
                    }
                } catch (error) {

                }

                //self.log('RiscoCloud ArmedState:' + body.overview.partInfo.armedStr + " / RiscoCloud OngoingAlarm: " + body.OngoingAlarm );

                var riscoState;
                // 0 -  Characteristic.SecuritySystemTargetState.STAY_ARM:
                // 1 -  Characteristic.SecuritySystemTargetState.AWAY_ARM:
                // 2-   Characteristic.SecuritySystemTargetState.NIGHT_ARM:
                // 3 -  Characteristic.SecuritySystemTargetState.DISARM:
                //self.log(body);

                if (body.OngoingAlarm == true) {
                    riscoState = 4;
                } else {
                    try {
                        var armedZones = body.overview.partInfo.armedStr.split(' ');
                        if (parseInt(armedZones[0]) > 0) {
                            riscoState = 1 // Armed
                        } else
                            riscoState = 3 // Disarmed
                    } catch (error) {
                        reject();
                    }
                }

                resolve(riscoState);
            } else
                reject();
        })
    })
}

function refreshState() {

    return new Promise(function (resolve, reject) {
        
        var post_data = {};

        var options = {
            url: 'https://www.riscocloud.com/ELAS/WebUI/Security/GetCPState',
            method: 'POST',
            headers: {
                "Referer": "https://www.riscocloud.com/ELAS/WebUI/MainPage/MainPage",
                "Origin": "https://www.riscocloud.com",
                "Cookie": riscoCookies
            },
            json: post_data
        };
        
        request(options, function (err, res, body) {
            if (!err) {
                // Check error inside JSON
                try {
                    if (body.error == 3) {
                        // Error. Try to login first
                        //self.log('Error: 3. Try to login first.');
                        reject();
                        return
                    }
                } catch (error) {

                }

                // Check if overview is present

                if (body.overview == undefined) {
                    // No changes. Empty response
                    resolve();
                    return
                }

                //console.log('No error, status: ', res.statusCode);
                //self.log('RiscoCloud ArmedState:', body.overview.partInfo.armedStr);
                //self.log('RiscoCloud OngoingAlarm: ', body.OngoingAlarm);
                //self.log('RiscoCloud ArmedState:' + body.overview.partInfo.armedStr + " / RiscoCloud OngoingAlarm: " + body.OngoingAlarm );

                var riscoState;
                // 0 -  Characteristic.SecuritySystemTargetState.STAY_ARM:
                // 1 -  Characteristic.SecuritySystemTargetState.AWAY_ARM:
                // 2-   Characteristic.SecuritySystemTargetState.NIGHT_ARM:
                // 3 -  Characteristic.SecuritySystemTargetState.DISARM:
                //self.log(body);

                if (body.OngoingAlarm == true) {
                    riscoState = 4;
                } else {
                    try {
                        var armedZones = body.overview.partInfo.armedStr.split(' ');
                        if (parseInt(armedZones[0]) > 0) {
                            riscoState = 1 // Armed
                        } else
                            riscoState = 3 // Disarmed
                    } catch (error) {
                        reject();
                    }
                }

                resolve(riscoState);
            } else
                reject();
        })
    })
}




function arm(aState) {

    //console.log('func: arm');
    return new Promise(function (resolve, reject) {

        var targetType;
        var targetPasscode;

        if (aState) {
            // ARM
            targetType = "0:armed";
            targetPasscode = "";
        } else {
            // DISARM
            targetType = "0:disarmed";
            targetPasscode = "------"
        }

        var post_data = {
            "type": targetType,
            "passcode": targetPasscode,
            "bypassZoneId": -1
        };

        var options = {
            url: 'https://www.riscocloud.com/ELAS/WebUI/Security/ArmDisarm',
            method: 'POST',
            headers: {
                "Referer": "https://www.riscocloud.com/ELAS/WebUI/MainPage/MainPage",
                "Origin": "https://www.riscocloud.com",
                "Cookie": riscoCookies
            },
            json: post_data
        };

        request(options, function (err, res, body) {
            if (!err) {
                try {
                    if (body.error == 3) {
                        // Error. Try to login first !
                        //self.log('Error: 3. Try to login first.');
                        reject();
                        return
                    }
                } catch (error) {

                }
                self.log('New Risco state set.');
                resolve();
            } else {
                var errMsg = 'Error ' + res.statusCode;
                self.log(errMsg);
                reject(errMsg);
            }
        })
    });
}

module.exports = {
    init,
    login,
    getState,
    refreshState,
    arm
};