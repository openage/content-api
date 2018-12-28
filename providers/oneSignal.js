'use strict';
var Client = require('node-rest-client').Client;
var client = new Client();

var _ = require('underscore');
var pushConfig = require('config').get('push');
// model = {subject, message, data}

exports.push=function(deviceId,model,callback){
      var args = {
        headers: {
            "Content-Type": "application/json",
            "Authorization": pushConfig.authSecret
        },
        data: {
            "app_id": pushConfig.appId,
            "data": model.data ? model.data : {},
            "headings": {
                en: model.subject
            },
            "contents": {
                en: model.message
            },
            "include_player_ids": [],
            "android_group": model.data && model.data.api ? model.data.api : ''
        }
    };

    if (typeof deviceId === Array) {
        _(deviceId).each(function(id) {
            args.data.include_player_ids.push(id);
        });
    } else {
        args.data.include_player_ids.push(deviceId);
    }

    if (pushConfig.testDeviceId) {
        args.data.include_player_ids.push(pushConfig.testDeviceId);
    }

    client.post(pushConfig.url, args, function(data, response) {
        if (callback) {
            callback();
        }
    });
}