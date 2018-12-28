'use strict';
var async = require('async');
var validator = require('validator');
var mailgun = require('mailgun-js');
var mailProvider = require('config').get('mailer');
var logger = require('../helpers/logger')('api.messages');
var template = require('../helpers/template');
var db = require('mongoose').models;

var templateSetter = function (scrum, info) {

    var format = template.formatter(scrum);
    return format.inject(info);

};

var sendMail = function (data, callback) {

    var log = logger.start('sending Mail');

    var mailer = new mailgun({ apiKey: mailProvider.api_key, domain: mailProvider.domain });

    mailer.messages().send(data, function (err, body) {
        if (err) {
            log.silly("Err: " + err);
            return callback(err);
        }
        logger.info(body);
        callback(null);
    });

};

var getUser = function (profileId, cb) {
    db.user.findOne({ profile: profileId })
        .select('phone facebookId')
        .exec(function (err, user) {
            if (err) {
                return cb(err);
            }
            cb(null, user);
        });
};

exports.reportAbuse = function (req, res) {

    // var info = {
    //     userId: req.user.phone || req.user.facebookId,
    //     name: req.user.profile.name,
    //     abusedType: req.body.abuseFor,
    //     abusedName: req.body.name
    // };

    // var data = {
    //     from: (req.user.phone || req.user.facebookId) + '@looped.com',
    //     to: mailProvider.adminEmail,
    //     subject: 'Abuse Reported',
    //     html: templateSetter("Hi Admin,<br><br>" +
    //         "An abuse has been reported by <b>{{name}} => {{userId}} </b>.<br><br>" +
    //         "for " + "<b>{{abusedType}}</b> name <b>{{abusedName}}</b><br><br>" +
    //         "To block this {{abusedType}} <a href='https://www.google.com'>click here</a>", info)
    // };

    // sendMail(data, function(err) {
    //     if (err) {
    //         return res.failure(err);
    //     }
    //     res.success('mail sent');
    // });


    async.waterfall([
        function (cb) {
            getUser(req.profile.id, cb);
        },
        function (user, cb) {

            var info = {
                userId: user.phone || user.facebookId,
                name: req.profile.name,
                abusedType: req.body.abuseFor,
                abusedName: req.body.name
            };

            var data = {
                from: (user.phone || user.facebookId) + '@domain.com',
                to: mailProvider.adminEmail,
                subject: 'Abuse Reported',
                html: templateSetter("Hi Admin,<br><br>" +
                    "An abuse has been reported by <b>{{name}} => {{userId}} </b>.<br><br>" +
                    "for " + "<b>{{abusedType}}</b> name <b>{{abusedName}}</b><br><br>" +
                    "To block this {{abusedType}} <a href='https://www.google.com'>click here</a>", info)
            };

            sendMail(data, function (err) {
                if (err) {
                    return cb(err);
                }
                cb(null);
            });
        }
    ], function (err) {
        if (err) {
            return res.failure(err);
        }
        res.success('mail sent');
    });

};

exports.create = function (req, res) {

    // var info = {
    //     userId: req.user.phone || req.user.facebookId,
    //     name: req.user.profile.name,
    //     description: req.body.description
    // };

    // var data = {
    //     from: (req.user.phone || req.user.facebookId) + '@looped.com',
    //     to: mailProvider.adminEmail,
    //     subject: 'Bug Reported',
    //     html: templateSetter("Hi Admin,<br><br>" +
    //         "A bug has been reported by <b>{{name}} => {{userId}} </b>.<br><br>" +
    //         "<b>Description:</b><br><br>" +
    //         "{{description}}", info)
    // };

    // sendMail(data, function(err) {
    //     if (err) {
    //         return res.failure(err);
    //     }
    //     res.success('mail sent');
    // });

    async.waterfall([
        function (cb) {
            getUser(req.profile.id, cb);
        },
        function (user, cb) {

            var info = {
                userId: user.phone || user.facebookId,
                name: req.profile.name,
                description: req.body.description
            };

            var data = {
                from: (user.phone || user.facebookId) + '@aqua.com',
                to: mailProvider.adminEmail,
                subject: 'Bug Reported',
                html: templateSetter("Hi Admin,<br><br>" +
                    "A bug has been reported by <b>{{name}} => {{userId}} </b>.<br><br>" +
                    "<b>Description:</b><br><br>" +
                    "{{description}}", info)
            };

            sendMail(data, function (err) {
                if (err) {
                    return cb(err);
                }
                cb(null);
            });
        }
    ], function (err) {
        if (err) {
            return res.failure(err);
        }
        res.success('mail sent');
    });

};
