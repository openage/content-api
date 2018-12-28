'use strict';
var async = require('async');

var db = require('mongoose').models;
var mapper = require('../mappers/notification');

exports.delete = function(req, res) {

    var profile = req.profile;

    for (var index in profile.notifications) {
        if (profile.notifications[index].data.id === req.params.id) {
            res.log.debug('notification found. removing it');
            profile.notifications.splice(index, 1);
            break;
        }
    }
    profile.save(function(err) {
        if (err) {
            return res.failure(err);
        }
        res.log.info('profile updated');
        return res.success();
    });
};

exports.search = function(req, res) {
    res.page(mapper.toSearchModel(req.profile.notifications));
};