"use strict";
var _ = require('underscore');
var db = require('mongoose').models;

exports.updateCommunity = function(model, callback) {

    var profileId = model.profileId,
        communityId = model.communityId,
        updateMe = model.set;

    db.community.findOneAndUpdate({
            _id: communityId,
            'members.profile': profileId
        }, updateMe)
        .then(function() {
            // if (!result || result.nModified !== 1) {
            //     return callback('can not activated');
            // }
            callback(null);
        })
        .catch(function(err) {
            callback(err);
        });

};