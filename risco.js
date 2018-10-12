var request = require('request');
var cookie = require('cookie');

var riscoCookies;
var risco_username;
var risco_password;
var risco_pincode;
var risco_siteId;
var self;
var req_counter;


function init(aUser, aPassword, aPIN, aSiteId, context) {
    risco_username = aUser;
    risco_password = aPassword;
    risco_pincode = aPIN;
    risco_siteId = aSiteId;
    self = context;
    req_counter = 0;

}

function login() {
    return new Promise(function (resolve, reject) {
        //self.log('login [step1] to RiscoCloud first stage...');

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
            try {
                if (!err && res.statusCode == 302) {
                    //self.log('Got Cookie, save it');
                    riscoCookies = res.headers['set-cookie'];

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
                        try {
                            if (!err && res.statusCode == 302) {
                                self.log('LoggedIn !');
                                resolve();
                                return
                            } else {
                                self.log('login [step2] > err:', err);
                                self.log(res);
                                reject('');
                                return
                            }


                        } catch (error) {
                            self.log('login [step2] > ', error);
                            self.log('login [step2] > err', err);
                            reject('');
                            return
                        }
                    })

                } else {
                    self.log('login [step1] > error during connecting with RiscoCloud', err);
                    self.log(res);
                    reject('');
                    return
                }
            } catch (error) {
                self.log('login [step1] > ', error);
                self.log('login [step1] > err', err);
                self.log(res);
                reject('');
                return
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
                    self.log(error);
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
                        self.log(error);
                        reject();
                        return
                    }
                }

                resolve(riscoState);
            } else {
                self.log('error during parse request', err);
                reject();
                return
            }
        });
    })
}

function refreshState() {

    return new Promise(function (resolve, reject) {
        var alive_url

        if (req_counter == 0) {
            alive_url = 'https://www.riscocloud.com/ELAS/WebUI/Security/GetCPState?userIsAlive=true';
        } else
            alive_url = 'https://www.riscocloud.com/ELAS/WebUI/Security/GetCPState';

        req_counter++;
        if (req_counter > 10) {
            alive_url = 'https://www.riscocloud.com/ELAS/WebUI/Security/GetCPState?userIsAlive=true';
            req_counter = 0;
        }

        var post_data = {};

        var options = {
            url: alive_url,
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
                        reject();
                        return
                    }
                } catch (error) {
                    self.log('Failed during GET GetCPState');
                    reject();
                    return
                }

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

                    if (body.overview == undefined) {
                        //self.log('No changes');
                        resolve();
                        return
                    }

                    try {
                        var armedZones = body.overview.partInfo.armedStr.split(' ');
                        var partArmedZones = body.overview.partInfo.partarmedStr.split(' ');

                        //self.log('armedZones:', armedZones[0]);

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
                        self.log('Failed during parse arm / partArmed zones', error);
                        reject();
                        return
                    }

                    /*
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
                                    reject();
                                    return
                                }
                            } catch (error) {
                                self.log('Failed during GET GetCPState');
                                reject();
                                return
                            }
                            
                            try {
                                var armedZones = body.overview.partInfo.armedStr.split(' ');
                                var partArmedZones = body.overview.partInfo.partarmedStr.split(' ');

                                self.log('armedZones:', armedZones[0]);
                                self.log('partarmedZones:', partArmedZones[0]);
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
                                self.log('Failed during parse arm / partArmed zones', error);
                                reject();
                                return
                            }

                        } else {
                            self.log('Error during request /WebUI/Overview/Get')
                            reject();
                            return
                        }
                       

                    });
                    */

                }
            } else {
                self.log('Error during GetCPState');
                reject();
            }
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