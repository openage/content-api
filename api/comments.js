'use strict';
var async = require('async');
var notificationService = require('../services/notification');
var _ = require('underscore');
var db = require('mongoose').models;
var mapper = require('../mappers');
var entitiesHelper = require('../helpers/entities');
var updateLatest = require('../api/participants').updateLatest;

var notify = function(action, chatRoomType, chatRoom, requstingProfile, profile, comment, cb) {
    notificationService.notify(profile, {
        entity: {
            id: chatRoom.id,
            picData: chatRoom.picData,
            picUrl: chatRoom.picUrl,
            type: chatRoomType,
            data: chatRoom,
            requstingPerson: requstingProfile
        },
        api: 'comments',
        action: action
    }, function() {
        cb(null, comment);
    });
};

var getProfiles = function(chatRoomModels, cb) {
    var profileIds = _.pluck(chatRoomModels, 'profile');
    db.profile.find({
        _id: {
            $in: profileIds
        }
    }, function(err, profiles) {
        if (err) {
            return cb(err);
        }
        cb(null, profiles);
    });
};
var chatRoom = function(model, commentedBy, callback) {
    var dbQuerry, id, folks;
    if (model.activity) {
        dbQuerry = db.activity;
        id = model.activity.id;
        folks = 'participants';
    }

    if (model.community) {
        dbQuerry = db.community;
        id = model.community.id;
        folks = 'members';
    }

    async.waterfall([
        function(cb) {
            dbQuerry.findById(id)
                .populate({
                    path: folks + '.profile',
                    populate: { path: 'user' }
                })
                .exec(cb);
        },
        function(chatRoom, cb) {
            if (!chatRoom) {
                return cb('chat room does not exist');
            }
            var comment = new db.comment({
                text: model.text,
                profile: commentedBy
            });

            if (folks === 'members') {
                comment.community = chatRoom;
            } else {
                comment.activity = chatRoom;
            }
            comment.save(function(err) {
                if (err) {
                    return cb(err);
                }
                cb(null, chatRoom, comment);

            });
        },
        function(chatRoom, comment, cb) {
            chatRoom.lastUpdate = {
                profile: commentedBy,
                content: comment.text
            };
            chatRoom.save(function(err) {
                if (err) {
                    return cb(err);
                }
                cb(null, folks, comment, chatRoom);
            });
        }
    ], function(err, folks, comment, chatRoom) {
        if (err) {
            return callback(err);
        }
        callback(null, folks, comment, chatRoom);
    });
};
// POST comment
exports.create = function(req, res) {
    var model = req.body;
    // var activityId = req.params.activityId || model.activity.id;
    async.waterfall([
            function(cb) {
                chatRoom(model, req.profile, cb);
            }
        ],
        function(err, folks, comment, chatRoom) {
            if (err) {
                return res.failure(err);
            }
            res.data(mapper.comment.toModel(comment));
            async.each(chatRoom[folks], function(person, cb) {
                if (person.profile.id.toString() === req.profile.id) {
                    return cb(null, comment);
                }
                var chatRoomType = folks === 'members' ? 'community' : 'activity';
                notify('created', chatRoomType, chatRoom, req.profile, person.profile, comment, cb);
            });
        });
};
// PUT comments/{id}
exports.update = function(req, res) {
    var model = req.body;
    async.waterfall([
        function(cb) {
            db.comment.findById(req.params.id).populate('activity community profile').exec(cb);
        },
        function(comment, cb) {
            comment.text = model.text;
            comment.save(function(err) {
                cb(err, comment);
            });
        }
    ], function(err, comment) {
        if (err) {
            return res.failure(err);
        }
        res.data(mapper.comment.toModel(comment));


        var persons = comment.community ? comment.community.members : comment.activity.participants;

        getProfiles(persons, function(err, profiles) {
            async.each(profiles, function(profile, cb) {
                if (profile.id.toString() === req.profile.id) {
                    return cb(null, comment);
                }
                var chatRoomType = comment.community ? 'community' : 'activity';
                var chatRoom = comment.community ? comment.community : comment.activity;
                notify('updated', chatRoomType, chatRoom, req.profile, profile, comment, cb);
            });
        });

    });
};
// PUT comments/{id}
exports.delete = function(req, res) {
    db.comment.findByIdAndRemove(req.params.id, function(err) {
        if (err) {
            return res.failure(err);
        }
        res.success('comment deleted');

    });
};
// GET comments/{id}
exports.get = function(req, res) {
    db.comment.findById(req.params.id)
        .populate('profile activity community')
        .exec(function(err, comment) {
            if (!comment) {
                return res.failure('comment does not exist');
            }
            res.data(mapper.comment.toModel(comment));
        });
};
// GET comments
exports.search = function(req, res) {
    // todo greater than today
    var query = {};
    if (req.query.activityId) {
        query.activity = {
            $eq: req.query.activityId
        };
    }
    if (req.query.communityId) {
        query.community = {
            $eq: req.query.communityId
        };
    }

    db.comment.find(query)
        .populate('profile activity community')
        .exec(function(err, comments) {
            if (err) {
                return res.failure(err);
            }
            res.page(mapper.comment.toSearchModel(comments));
        });
};