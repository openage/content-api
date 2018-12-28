"use strict";
var async = require('async');
var _ = require('underscore');
var db = require('mongoose').models;
var mapper = require('../mappers/interest');
//  link interest to my profile (create if one does not exist)
exports.create = function(req, res) {
    var model = req.body;
    var query = {};
    query.name = model.name;

    async.waterfall([
            function(cb) {
                db.interest.findOne(query, cb);
            },
            function(interest, cb) {
                if (interest) {
                    return cb(null, interest);
                }
                res.log.info('interest not found. creating it');
                query.name = model.name;
                (new db.interest(query)).save(function(err, item) {
                    cb(err, item);
                });
            }
        ],
        function(err, interest) {
            if (err) {
                return res.failure(err);
            }
            res.data(mapper.toModel(interest));
        });
};
//  remove interest from my profile
// DELETE interests/{interestId}
exports.delete = function(req, res) {
    var profile = req.profile;

    for (var index in profile.interests) {
        if (profile.interests[index].id === req.params.id) {
            res.log.debug('interest found. removing it');
            profile.interests.splice(index, 1);
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
// discover interests
exports.search = function(req, res) {

    db.interest.find({}, function(err, interests) {
        if (err) {
            return res.failure(err);
        }
        res.page(mapper.toSearchModel(interests));
    });
};

exports.createMany = function(req, res) {
    var model = req.body;
    var query = {};
    // query.name = model.name;
    async.eachSeries(model.names, function(name, callback) {
        query.name = name;
        async.waterfall([
                function(cb) {
                    db.interest.findOne(query, cb);
                },
                function(interest, cb) {
                    if (interest) {
                        return callback(null);
                    }

                    res.log.info('interest not found. creating it');

                    new db.interest(query)
                        .save(function(err, item) {
                            cb(err, item);
                        });
                }
            ],
            function(err) {
                if (err) {
                    return callback(err);
                }
                callback(null);
            });
    }, function(err) {
        if (err) {
            return res.failure(err);
        }
        res.success('all interests created');
    });


};