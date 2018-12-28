'use strict';
var db = require('mongoose').models;

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