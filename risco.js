var request = require('request');
var cookie = require('cookie');

var riscoCookies;
var risco_username;
var risco_password;
var risco_pincode;
var risco_siteId;
var self;


function init(aUser, aPassword, aPIN, aSiteId, context) {
    risco_username = aUser;
    risco_password = aPassword;
    risco_pincode = aPIN;
    risco_siteId = aSiteId;
    self = context;


}

function login() {

    return new Promise(function (resolve, reject) {
        self.log('login to RiscoCloud first stage...');

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
                self.log('Got Cookie, save it');
                riscoCookies = res.headers['set-cookie'];
                //self.log('Cookie:', riscoCookies);

                var post_data = {
                    "SelectedSiteId": risco_siteId,
                    "Pin": risco_pincode
                };


                var options = {
                    url: 'https://www.riscocloud.com/ELAS/WebUI/SiteLogin',
                    method: 'POST',
                    headers: {
                        'Cookie': riscoCookies,
                        'Host': 'www.riscocloud.com',
                        'Origin': 'https://www.riscocloud.com',
                        'Referer': 'https://www.riscocloud.com/ELAS/WebUI/SiteLogin/Index'
                    },
                    json: post_data
                };
                request(options, function (err, res, body) {
                    if (!err && res.statusCode == 302) {
                        self.log('LoggedIn !');
                        resolve();
                        return
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
                    console.log('Failed to read body in risco response');
                    reject();
                    return
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
                        var partArmedZones = body.overview.partInfo.partarmedStr.split(' ');

                        if (parseInt(armedZones[0]) > 0) {
                            riscoState = 1; // Armed
                        } else if (parseInt(partArmedZones[0]) > 0) {
                            riscoState = 2; // Partially Armed
                        } else {
                            riscoState = 3; // Disarmed
                        }
                    } catch (error) {
                        reject();
                    }
                }

                resolve(riscoState);
            } else
                self.log('error during parse request', err);
            reject();
            return
        });
    })
}

function refreshState() {

    self.log('Risco refreshState');
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
                        self.log('Body.error = 3 , relogin.');
                        reject();
                        return
                    }
                } catch (error) {
                    self.log('Failed during GET GetCPState');
                    reject();
                    return
                }

                // Check if overview is present
                /*
                if (body.overview == undefined) {
                    // No changes. Empty response
                    resolve();
                    return
                }
                */

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
                    // Try different GET Method

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
                                    self.log('Body.error = 3 , relogin.');
                                    reject();
                                    return
                                }
                            } catch (error) {
                                self.log('Failed during GET GetCPState');
                                reject();
                                return
                            }

                            if (body.overview == undefined) {
                                // No changes. Empty response
                                resolve();
                                return
                            }

                            try {
                                var armedZones = body.overview.partInfo.armedStr.split(' ');
                                var partArmedZones = body.overview.partInfo.partarmedStr.split(' ');

                                if (parseInt(armedZones[0]) > 0) {
                                    riscoState = 1; // Armed
                                } else if (parseInt(partArmedZones[0]) > 0) {
                                    riscoState = 2; // Partially Armed
                                } else {
                                    riscoState = 3; // Disarmed
                                }

                                resolve(riscoState);
                                return


                            } catch (error) {
                                self.log('Failed during parse arm zones', error);
                                reject();
                                return
                            }

                        } else
                            self.log('Error during request /WebUI/Overview/Get')
                        reject();
                        return;
                    });


                }


            } else
                reject();
        })
    })
}




function arm(aState, cmd) {

    //console.log('func: arm');
    return new Promise(function (resolve, reject) {

        var targetType = cmd;
        var targetPasscode;

        if (aState) {
            // ARM
            targetPasscode = "";
        } else {
            // DISARM
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