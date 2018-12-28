'use strict';
var jwt = require('jsonwebtoken');
var db = require('mongoose').models;
var authConfig = require('config').get('auth');
var async = require('async');

exports.canHaveToken = function(req, res, next) {
    var token = req.body.token || req.query.token || req.headers['x-access-token'];
    if (!token) {
        return exports.requiresSchool(req, res, next);
    }
    extractToken(token, req, res, next);
};
exports.requiresToken = function(req, res, next) {
    var token = req.body.token || req.query.token || req.headers['x-access-token'];
    if (!token) {
        return res.status(403).send({
            success: false,
            message: 'token is required.'
        });
    }

    extractToken(token, req, res, next);
};

var extractToken = function(token, req, res, next) {

    jwt.verify(token, authConfig.secret, {
        ignoreExpiration: true
    }, function(err, claims) {
        if (err) {
            return res.failure('invalid token.');
        }
        var schoolCode = req.headers['school-code'];
        if (!schoolCode) {
            return res.status(403).send({
                success: false,
                message: 'school-code is required.'
            });
        }

        async.waterfall([
                function(cb) {
                    db.profile.findOneAndUpdate({
                            _id: claims.profileId
                        }, {
                            lastSeen: new Date()
                        })
                        .populate('interests user connections communities')
                        .exec(function(err, profile) {
                            if (err) {
                                return cb(err);
                            }

                            cb(null, profile);
                        });
                },
                function(profile, cb) {
                    db.school.findOne({
                            code: schoolCode
                        }
                        //_id: claims.schoolId// todo
                    ).exec(function(err, school) {
                        if (err) {
                            return cb(err);
                        }
                        if (!school) {
                            return cb('schoolCode inCorrect');
                        }
                        cb(null, profile, school);
                    });
                }
            ],
            function(err, profile, school) {
                req.school = school;
                req.profile = profile;
                req.filters.add('school', school.id.toObjectId());
                next();
            });
    });
};

exports.requiresSchool = function(req, res, next) {
    var schoolCode = req.body.schoolCode || req.query.schoolCode || req.headers['school-code'];

    if (!schoolCode) {
        return res.accessDenied('school-code is required.');
    }

    db.school.findOne({
        code: schoolCode
    }).populate('owner').exec(function(err, school) {
        if (err) {
            res.log.error(err);
            return res.accessDenied('error occured while getting school');
        }

        if (!school) {
            return res.accessDenied('school does not exist.');
        }

        if (school.status !== 'active') {
            return res.accessDenied('school is not active.');
        }

        req.school = school;
        req.filters.add('school', school.id.toObjectId());
        next();
    });
};

exports.getToken = function(user) {

    var claims = { //todo
        schoolId: user.school,
        profileId: user.profile.id
    };

    return jwt.sign(claims, authConfig.secret, {
        expiresIn: authConfig.tokenPeriod || 1440
    });
};

exports.newPin = function() {
    return Math.floor(1000 + Math.random() * 9000);
};