'use strict';
var smsConfig = require('config').get('smsRoute');
var Client = require('node-rest-client').Client;
var logger = require('@open-age/logger')('sms');

exports.sendMessage = function (mobileNumber, pin, callback) {
    var log = logger.start('send');
    log.info({
        pin: pin,
        mobileNumber: mobileNumber
    });
    var msg;
    switch (pin) {
        case 0: msg = 'Your School data sync failed, Please Try Again';
            break;
        case 1: msg = 'Your school data is Synced Successfully';
            break;
        default: msg = 'Your Aqua Pin Is  ' + pin + ' ';
    }


    var client = new Client();
    client.get("http://sms6.routesms.com:8080/bulksms/bulksms?username=" + smsConfig.userName +
        "&password=" + smsConfig.password + "&type=" + smsConfig.type + "&dlr=" + smsConfig.dlr +
        "&destination=" + mobileNumber + "&source=" + smsConfig.source +
        "&message=" + msg + "",
        function (data) {
            log.debug(data);
            if (callback) {
                callback(null, data);
            }
        });
};
