var request = require('request');
var cookie = require('cookie');

module.exports.RiscoPanelSession = RiscoPanelSession;

function extractError(aBody) {
    var serverInfo_begin = aBody.indexOf("<span class=\"infoServer\">");
    var serverInfo_end = aBody.indexOf("</span>", serverInfo_begin);
    return aBody.substring(serverInfo_begin + 26, serverInfo_end - 7);
}

function RiscoPanelSession(aUser, aPassword, aPIN, aSiteId, aPartMode, aPartId, aLog) {
    this.risco_username = encodeURIComponent(aUser);
    this.risco_password = encodeURIComponent(aPassword);
    this.risco_pincode = aPIN;
    this.risco_siteId = aSiteId;
    this.risco_part_mode = aPartMode;
    this.risco_part_id = aPartId;
    this.log = aLog;
    this.req_counter = 0;
    this.riscoCookies;
    this.SessionLogged = false;

}

RiscoPanelSession.prototype = {
    login: function() {
        var self = this;
        if (!self.SessionLogged){
            return new Promise(function (resolve, reject) {
            //this.log('login [step1] to RiscoCloud first stage...');

                var post_data = 'username=' + self.risco_username + '&password=' + self.risco_password;

                var options = {
                    url: 'https://www.riscocloud.com/ELAS/WebUI/',
                    method: 'POST',
                    headers: {
                        'Content-Length': post_data.length,
                        'Content-type': 'application/x-www-form-urlencoded'
                        },
                    body: post_data
                };

                request(options, function (err, res, body) {
                    try {
                        if (!err && res.statusCode == 302) {
                            //this.log('Got Cookie, save it');
                            self.riscoCookies = res.headers['set-cookie'];

                            var post_data = 'SelectedSiteId=' + self.risco_siteId + '&Pin='+ self.risco_pincode;

                            var options = {
                                url: 'https://www.riscocloud.com/ELAS/WebUI/SiteLogin',
                                method: 'POST',
                                headers: {
                                    'Cookie': self.riscoCookies,
                                    'Host': 'www.riscocloud.com',
                                    'Origin': 'https://www.riscocloud.com',
                                    'Referer': 'https://www.riscocloud.com/ELAS/WebUI/SiteLogin/Index',
                                    'Content-Length': post_data.length,
                                    'Content-type': 'application/x-www-form-urlencoded'
                                },
                                body: post_data
                            };
                            request(options, function (err, res, body) {
                                try {
                                    if (!err && res.statusCode == 302) {
                                        self.log('LoggedIn !');
                                        self.SessionLogged = true;
                                        resolve();
                                        return
                                    } else {
                                        self.log('Status Code: ', res.statusCode);
                                        self.log('login [step2] > error:', extractError(body));
                                        reject('');
                                        return
                                    }
                                } catch (error) {
                                    self.log(error);
                                    reject('');
                                    return
                                }
                            });
                        } else {
                            self.log('Status Code: ', res.statusCode);
                            self.log('login [step1] > error:', extractError(body));
                            reject('');
                            return
                        }
                    } catch (error) {
                        self.log(error);
                        reject('');
                        return
                    }
                });
            });
        }
    },

    logout: function() {
        var self = this;
        return new Promise(function (resolve, reject) {

            var options = {
                url: 'https://www.riscocloud.com/ELAS/WebUI/UserLogin/Logout',
                method: 'GET',
            };

            request(options, function (err, res, body) {
                try {
                    if (!err && res.statusCode == 302) {
                        //this.log('Got Cookie, save it');
                        self.SessionLogged = false;
                        self.riscoCookies = null;

                        var options = {
                            url: 'https://www.riscocloud.com/ELAS/WebUI/UserLogin/LogoutUser',
                            method: 'GET',
                        };
                        request(options, function (err, res, body) {
                            try {
                                if (!err && res.statusCode == 302) {
                                    self.log('LoggedIn !');
                                    resolve();
                                    return
                                } else {
                                    self.log('Status Code: ', res.statusCode);
                                    self.log('login [step2] > error:', extractError(body));
                                    reject('');
                                    return
                                }
                            } catch (error) {
                                self.log(error);
                                reject('');
                                return
                            }
                        });
                    } else {
                        self.log('Status Code: ', res.statusCode);
                        self.log('login [step1] > error:', extractError(body));
                        reject('');
                        return
                    }
                } catch (error) {
                    self.log('error when LogOut. Considere succes and session killed');
                    self.log(error);
                    reject('');
                    return
                }
            });
        });
    },

    IsLogged: function(){
        return self.SessionLogged;
    },

    IsUserCodeExpired: function(){
        var self = this;
        return new Promise(function (resolve, reject) {
            var post_data = {};

            var options = {
                url: 'https://www.riscocloud.com/ELAS/WebUI/SystemSettings/IsUserCodeExpired',
                method: 'POST',
                headers: {
                    'Referer': 'https://www.riscocloud.com/ELAS/WebUI/MainPage/MainPage',
                    'Origin': 'https://www.riscocloud.com',
                    'Cookie': self.riscoCookies
                },
                json: post_data
            };
            request(options, function (err, res, body) {
                try {
                    if (!err && res.statusCode == 200) {
                        if (body.error != 0) {
                            reject(false);
                            return
                        } else {
                            resolve(body.pinExpired);
                            return
                        }
                    } else {
                        self.log('Status Code: ', res.statusCode);
                        reject(null);
                        return
                    }
                } catch (error) {
                    self.log(error);
                    reject(null);
                    return
                }
            });
        });
    },

    ValidateUserCode: function() {
        var self = this;
        return new Promise(function (resolve, reject) {
            var post_data = 'code=' + self.risco_pincode;
            var options = {
                url: 'https://www.riscocloud.com/ELAS/WebUI/SystemSettings/ValidateUserCode',
                method: 'POST',
                headers: {
                    'Referer': 'https://www.riscocloud.com/ELAS/WebUI/MainPage/MainPage',
                    'Origin': 'https://www.riscocloud.com',
                    'Cookie': self.riscoCookies,
                    'Content-Length': post_data.length,
                    'Content-type': 'application/x-www-form-urlencoded'
                },
                body: post_data
            };

            request(options, function (err, res, body) {
                try {
                    if (!err && res.statusCode == 200) {
                        if (body.error == 14) {
                            self.log('PinCode Error');
                            reject(false);
                            return
                        } else {
                            resolve(true);
                            return
                        }
                    } else {
                        self.log('Status Code: ', res.statusCode);
                        reject(false);
                        return
                    }
                } catch (error) {
                    self.log(error);
                    reject('');
                    return
                }
            });
        });
    },

    getState: function() {
        var self = this;
        return new Promise(function (resolve, reject) {
            var post_data = {};
            var risco_Part_API_url;

            if (self.risco_part_mode) {
                risco_Part_API_url = 'https://www.riscocloud.com/ELAS/WebUI/Detectors/Get'
            } else {
                risco_Part_API_url = 'https://www.riscocloud.com/ELAS/WebUI/Overview/Get'
            }

            var options = {
                url: risco_Part_API_url,
                method: 'POST',
                headers: {
                    'Referer': 'https://www.riscocloud.com/ELAS/WebUI/MainPage/MainPage',
                    'Origin': 'https://www.riscocloud.com',
                    'Cookie': self.riscoCookies
                },
                json: post_data
            };

            request(options, function (err, res, body) {
                if (!err) {
                    // Check error inside JSON
                    try {
                        if (body.error == 3) {
                            self.log('error reject');
                            // Error. Try to login first
                            //this.log('Error: 3. Try to login first.');
                            reject();
                            return
                        }
                    } catch (error) {
                        self.log(error);
                        reject();
                        return
                    }

                    //this.log('RiscoCloud ArmedState:' + body.overview.partInfo.armedStr + " / RiscoCloud OngoingAlarm: " + body.OngoingAlarm );
                    var riscoState;

                    try {
                        if (self.IsUserCodeExpired() != false) {
                            self.ValidateUserCode();
                        }
                        if (self.risco_part_mode) {
                            var partStatusIcon = body.detectors.parts[self.risco_part_id].armIcon;
                            var partName = body.detectors.parts[self.risco_part_id].name;

                            if ( partStatusIcon.indexOf('ico-armed') > 0) {
                                riscoState = 1; // Armed
                            } else if ( partStatusIcon.indexOf('ico-partial') > 0) {
                                riscoState = 2; // Partially Armed
                            } else {
                                riscoState = 3; // Disarmed
                            }
                        } else {
                            var armedZones = body.overview.partInfo.armedStr.split(' ');
                            var partArmedZones = body.overview.partInfo.partarmedStr.split(' ');

                            if (parseInt(armedZones[0]) > 0) {
                                riscoState = 1; // Armed
                            } else if (parseInt(partArmedZones[0]) > 0) {
                                riscoState = 2; // Partially Armed
                            } else {
                                riscoState = 3; // Disarmed
                            }
                        }
                    } catch (error) {
                        self.log(error);
                        reject();
                        return
                    }
                    resolve(riscoState);
                    return
                } else {
                    self.log(err);
                    reject();
                    return
                }
            });
        });
    },

    getCPState: function() {
        var self = this;
        return new Promise(function (resolve, reject) {
            var alive_url = 'https://www.riscocloud.com/ELAS/WebUI/Security/GetCPState';

            self.req_counter++;
            if (self.req_counter > 10) {
                alive_url = 'https://www.riscocloud.com/ELAS/WebUI/Security/GetCPState?userIsAlive=true';
                self.req_counter = 0;
            }

            var options = {
                url: alive_url,
                method: 'POST',
                headers: {
                    'Referer': "https://www.riscocloud.com/ELAS/WebUI/MainPage/MainPage",
                    'Origin': "https://www.riscocloud.com",
                    'Cookie': self.riscoCookies
                },
                json: {}
            };

            request(options, function (err, res, body) {
                if (!err) {
                    // Check error inside JSON
                    try {
                        if (body.error == 3) {
                            reject(false);
                            return
                        }
                   } catch (error) {
                        self.log('Failed during GET GetCPState');
                        reject(false);
                        return
                    }

                    var riscoState;
                    if (body.OngoingAlarm == true) {
                        self.log("RiscoCloud OngoingAlarm: " + body.OngoingAlarm );
                        resolve(4);
                        return
                    }

                    try {
                        if (self.IsUserCodeExpired() != false) {
                            self.ValidateUserCode();
                        }
                        resolve(self.getState());
                        return
                    } catch (error) {
                        self.log('Failed during parse arm / partArmed zones', error);
                        reject(false);
                        return
                    }
                } else {
                    self.log('Error during GetCPState');
                    reject(false);
                }
            });
        });
    },

    arm: function(aState, cmd) {
        var self = this;
        return new Promise(function (resolve, reject) {

            var targetType = cmd;
            var targetPasscode;
            self.log('Arm/Disarm Func');
            self.log('aState :' + aState);
            self.log('cmd :'+ targetType);

            if (self.risco_part_mode) {
                targetType = self.risco_part_id + ':' + targetType;
            }
            self.log('cmd apres part mode :'+ targetType);

            if (aState) {
                // ARM
                targetPasscode = "";
            } else {
                // DISARM
                targetPasscode = "------"
            }

            var post_data = 'type=' + targetType + '&passcode=' + targetPasscode + '&bypassZoneId=-1';

            var options = {
                url: 'https://www.riscocloud.com/ELAS/WebUI/Security/ArmDisarm',
                method: 'POST',
                headers: {
                    'Referer': "https://www.riscocloud.com/ELAS/WebUI/MainPage/MainPage",
                    'Origin': "https://www.riscocloud.com",
                    'Cookie': self.riscoCookies,
                    'Content-Length': post_data.length,
                    'Content-type': 'application/x-www-form-urlencoded'
                },
                body: post_data
            };

            request(options, function (err, res, body) {
                if (!err) {
                    try {
                        self.log('Body Arm Cmd :' + JSON.stringify(body));
                        if (body.error == 3) {
                            // Error. Try to login first !
                            //this.log('Error: 3. Try to login first.');
                            reject();
                            return
                        }
                    } catch (error) {
                        self.log(error);
                        reject();
                        return
                    }
                    self.log('Risco state updated');
                    resolve();
                } else {
                    var errMsg = 'Error ' + res.statusCode;
                    self.log(errMsg);
                    reject(errMsg);
                }
            });
        });
    }
}
