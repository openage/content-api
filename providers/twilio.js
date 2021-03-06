'use strict';
var logger = require('@open-age/logger')('providers.twilio');
var smsConfig = require('config').get('sms');

var twilio = require('twilio')(smsConfig.id, smsConfig.token);


exports.send = function (to, data, cb) {
    var log = logger.start('send');
    var sms = {
        to: to,
        from: data.from || smsConfig.from,
        body: data.message || data
    };

    log.debug(sms);

    if (!smsConfig.disabled) {
        twilio.messages.create(sms);
    } else {
        log.info('disabled');
    }

    if (cb) {
        cb(null);
    }
};
