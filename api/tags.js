"use strict";
var async = require('async');
var _ = require('underscore');
var db = require('mongoose').models;
var mapper = require('../mappers/tag');

exports.create = function(req, res) {
    var model = req.body;
    // var profile = req.user.profile;

    var query = {};
    // if (model.id) {
    //     query._id = model.id;
    // } else {
        query.name = model.name;
    // }

    async.waterfall([
            function(cb) {
                db.tag.findOne(query, cb);
            },
            function(tag, cb) {
                if (tag) {
                    return cb(null, tag);
                }
                res.log.info('tag not found. creating it');
                (new db.tag(query)).save(function(err, tag) {
                    cb(err, tag);
                });
            }
            // function(tag, cb) {
            //     if (!_(profile.tags).find(function(item) { return item.name === tag.name; })) {
            //         res.log.info('tag attached to profile');
            //         profile.tags.push(tag);
            //         profile.save(function(err) {
            //             cb(err, tag);
            //         });
            //     } else {
            //         cb(null, tag);
            //     }
            // }
        ],
        function(err, tag) {
            if (err) {
                return res.failure(err);
            }
             res.data(mapper.toModel(tag));
        });
};

// DELETE tags/{tagId}
exports.delete = function(req, res) {
    var profile = req.user.profile;

    for (var index in profile.tags) {
        if (profile.tags[index].id === req.params.id) {
            res.log.debug('tag found. removing it');
            profile.tags.splice(index, 1);
            break;
        }
    }
    profile.save(function(err) {
        if (err) {
            return res.failure(err);
        }
        return res.success();
    });
};

exports.search = function(req, res) {
    db.tag.find({}, function(err, tags) {
        if (err) {
            res.failure(err);
        }
        res.page(mapper.toSearchModel(tags));
    });
};