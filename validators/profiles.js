'use strict';
var db = require('mongoose').models;


exports.canUpdate = function(req, callback) {
    if (req.params.id !== 'my' && req.user.profile.id !== req.params.id) {
        return callback('cannot update other person profile');
    }

    callback(null);
};
exports.canSearch = function(req, cb) {
    if (req.school.orgCode) {
        db.school.find({
            orgCode: req.school.orgCode,
        }).exec(function(err, schools) {
            if (err || schools) {
                req.sharedSchools = schools;
                return cb(null);
            } else {
                return cb(null);
            }
        });
    } else {
        return cb(null);
    }

};