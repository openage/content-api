'use strict';
var async = require('async');
var notificationService = require('../services/notification');
var _ = require('underscore');
var db = require('mongoose').models;
var mapper = require('../mappers');
var entitiesHelper = require('../helpers/entities');
var notifyUpdation = require('../helpers/notifyUpdations');
var moment = require('moment');
var participantInvitation = require('./participants');


var findProfile = function (req, cb) {
    db.profile.findOne({
        _id: req.user.profile.id
    }, function (err, profile) {

        if (err) {
            cb(err);
        } else {
            cb(null, profile);
        }
    });

};
exports.findProfile = findProfile;

var notifyAll = function (req, activity, action) {


    var query = {};
    var school = {};
    async.waterfall([
        function (cb) {
            db.profile.find(query)
                .populate('user')
                .exec(function (err, profiles) {
                    if (err) {
                        return cb(null);
                    }
                    var deviceProfiles = _.filter(profiles, function (profile) { return profile.user.device.id });
                    return cb(null, deviceProfiles);
                })
        },
        function (profiles, cb) {
            async.eachSeries(profiles, function (profile, next) {
                    notificationService.notify(profile, {
                        entity: {
                            id: activity.id,
                            type: 'activity',
                            data: activity,
                            picUrl: activity.picUrl,
                            requstingPerson: profile
                        },
                        api: 'admin',
                        action: action
                    }, function () {
                        next();
                    });
                },
                function () {
                    cb();
                })
        }
    ], function () {
        return
    })
}

// POST activiites
exports.create = function (req, res) {

    var model = req.body;
    var myProfile = req.profile;


    /////////////////hack//////////////////////
    /////////////////hack//////////////////////
    /////////////////hack//////////////////////
    if (!_.isEmpty(model.participants) && typeof (model.participants[0]) === 'object') {
        var participantIds = [];
        _.each(model.participants, function (entity) {
            participantIds.push(entity.profile.id);
        });
        model.participants = participantIds;
    }
    /////////////////hack//////////////////////
    /////////////////hack//////////////////////
    /////////////////hack//////////////////////

    var communityId = req.params.communityId || model.community.id;

    async.waterfall([
            function (cb) {
                db.community.findById(communityId)
                    .populate('activities members.profile')
                    .exec(cb);
            },
            function (community, cb) {
                db.profile.findById(req.profile.id)
                    .populate('activities')
                    .exec(function (err, profile) {
                        cb(err, community, profile);
                    });
            },
            function (community, profile, cb) {
                var activity = new db.activity({
                    subject: model.subject,
                    body: model.body,
                    type: model.type, // post, event, task
                    picUrl: model.picUrl,
                    feedUrl: model.feedUrl,
                    picData: model.picData,
                    icon: model.icon,
                    dueDate: model.dueDate,
                    status: 'active',
                    location: model.location,
                    attachments: model.attachments || [], //files
                    school: req.school,
                    community: community,
                    owner: myProfile,
                    // isPublic and isDefault will be same as community
                    isPublic: community.isPublic,
                    isDefault: community.isDefault,

                });

                if (community.isDefault && !community.isPublic) {
                    var participantIds = [];
                    _.each(community.members, function (member) {
                        if (member.profile.id !== profile.id) {
                            participantIds.push(member.profile.id);
                        }
                    });
                    model.participants = participantIds;
                }
                activity.participants.push({
                    status: 'active',
                    date: new Date(),
                    profile: profile
                });
                activity.save(function (err) {
                    if (err) {
                        return cb(err);
                    }
                    cb(null, community, profile, activity);

                });
            },
            function (community, profile, activity, cb) {

                if (req.profile.type === 'admin') {
                    return cb(null, community, profile, activity);
                }

                if (_.isEmpty(model.participants)) {
                    return cb(null, community, profile, activity);
                }

                async.waterfall([
                    function (callme) {
                        db.profile.find({
                            _id: {
                                $in: model.participants
                            }
                        }, function (err, profiles) {
                            if (err) {
                                return callme(err);
                            }
                            callme(null, profiles);
                        });
                    },
                    function (profiles, callme) {
                        async.each(profiles, function (profile, next) {

                            profile.activities.push({ //invited person add to his/her profile
                                "status": "invited",
                                activity: activity,
                                date: new Date()
                            });

                            activity.participants.push({ //invited person add to activity
                                "status": "invited",
                                profile: profile,
                                date: new Date()
                            });

                            profile.save(function (err) {
                                if (err) {
                                    return callme(err);
                                }
                                participantInvitation.notify(activity, profile, 'invited', true, req.profile, function (err) {
                                    if (err) {
                                        return next(err);
                                    }
                                    next(null);
                                });
                            });

                        }, function (err) {

                            if (err) {
                                return callme(err);
                            }
                            callme(null, activity);
                        });
                    },
                    function (activity, callme) {

                        activity.save(function (err) {
                            if (err) {
                                return callme(err);
                            }
                            callme(null);
                        });
                    }
                ], function (err) {
                    if (err) {
                        return cb(err);
                    }
                    cb(null, community, profile, activity);
                });
            },
            function (community, profile, activity, cb) {

                if (req.profile.type === 'admin') {
                    if (community.isDefault && community.isPublic) {
                        notifyAll(req, activity, 'creation');
                    }
                }

                community.activities.push(activity._id);
                community.save(function (err) {
                    if (err) {
                        return cb(err);
                    }
                    cb(null, profile, activity);
                });
            },
            function (profile, activity, cb) {

                profile.activities.push({
                    status: 'active',
                    date: new Date(),
                    activity: activity
                });
                profile.save(function (err) {
                    cb(err, activity);
                });
            }
        ],
        function (err, activity) {
            if (err) {
                return res.failure(err);
            }
            res.data(mapper.activity.toModel(activity));
        });
};

// PUT activities/{id}
exports.update = function (req, res) {
    var model = req.body;
    /////////////////hack//////////////////////
    /////////////////hack//////////////////////
    /////////////////hack//////////////////////
    if (!_.isEmpty(model.participants) && typeof (model.participants[0]) === 'object') {
        var participantIds = [];
        _.each(model.participants, function (entity) {
            participantIds.push(entity.profile.id);
        });
        model.participants = participantIds;
    }
    /////////////////hack//////////////////////
    /////////////////hack//////////////////////
    /////////////////hack//////////////////////

    async.waterfall([
        function (cb) {
            db.activity.findOne({
                    _id: req.params.id
                }).populate('participants.profile owner community lastUpdate.profile')
                .exec(cb);
        },
        function (activity, cb) {
            // todo only admin should be able to update the activity
            activity = entitiesHelper(activity).set(model, [
                'subject',
                'body',
                'type',
                'picUrl',
                'picData',
                'dueDate',
                'attachments',
                'isPublic',
                'status',
                'icon',
                'location'
            ]);

            activity.save(function (err) {
                cb(err, activity);
            });
        }
    ], function (err, activity) {
        if (err) {
            return res.failure(err);
        }

        if (_.isEmpty(model.participants)) {
            return res.data(mapper.activity.toModel(activity));;
        }
        async.waterfall([
            function (callme) {
                db.profile.find({
                        _id: {
                            $in: model.participants
                        }
                    }).populate('user')
                    .exec(function (err, profiles) {
                        if (err) {
                            return callme(err);
                        }
                        callme(null, profiles);
                    });
            },
            function (profiles, callme) {
                async.each(profiles, function (profile, next) {

                    profile.activities.push({ //invited person add to his/her profile
                        "status": "invited",
                        activity: activity,
                        date: new Date()
                    });

                    activity.participants.push({ //invited person add to activity
                        "status": "invited",
                        profile: profile,
                        date: new Date()
                    });

                    profile.save(function (err) {
                        if (err) {
                            return callme(err);
                        }
                        if (req.profile.type === 'admin') {
                            if (activity.isDefault && activity.isPublic) {
                                notifyAll(req, activity, 'updation');
                            }
                        }
                        participantInvitation.notify(activity, profile, 'updation', true, req.profile, function (err) {
                            if (err) {
                                return next(err);
                            }
                            next(null);
                        });
                    });

                }, function (err) {

                    if (err) {
                        return callme(err);
                    }
                    callme(null, activity);
                });
            },
            function (activity, callme) {

                activity.save(function (err) {
                    if (err) {
                        return callme(err);
                    }
                    callme(null);
                });
            }
        ], function (err) {
            if (err) {
                throw (err);
            }
            res.data(mapper.activity.toModel(activity));
        });

        // var activeMembers = _.filter(activity.participants, function(item) {
        //     if (item.status === "active" && item.profile.id !== req.profile.id) {
        //         return item;
        //     }
        // });
        // var data = {
        //     api: 'participants',
        //     action: 'updation',
        //     modelIncluded: false
        // };
        // var type = 'activity';
        // async.each(activeMembers, function(item, callback) {
        //     var block = {
        //         id: item.profile.id
        //     };
        //     notifyUpdation.updation(block, data, type, activity.id, function(err) {
        //         if (err) {
        //             return callback(err);
        //         }
        //     });
        // });
    });
};

// PUT activities/{id}
exports.delete = function (req, res) {
    var model = req.body;
    async.waterfall([
        function (cb) {
            db.activity.findOne({
                _id: req.params.id
            }, cb);
        },
        function (activity, cb) {
            activity.status = 'deleted';
            activity.save(function (err) {
                cb(err, activity);
            });
        }
    ], function (err, activity) {
        if (err) {
            return res.failure(err);
        }
        return res.success();
    });
};

// GET activities/{id}
exports.get = function (req, res) {
    // if (req.params.id === "today") {
    //     var date = moment();
    //     var day = date.date();
    //     var month = date.month() + 1;
    //     if (day <= 9) {
    //         day = "0" + day;
    //     }
    //     if (month <= 9) {
    //         month = "0" + month;
    //     }
    //     var year = date.year();
    //     var todayl = year + "-" + month + "-" + day + "T00:00:00.000+05:30";
    //     var todayu = year + "-" + month + "-" + day + "T24:00:00.000+05:30";
    //     db.activity.find({
    //             participants: {
    //                 $elemMatch: {
    //                     profile: req.profile.id
    //                 }
    //             },
    //             dueDate: {
    //                 $gte: todayl,
    //                 $lte: todayu
    //             }
    //         }).sort({
    //             updated_At: -1
    //         })
    //         .exec(function(err, result) {
    //             if (err) {
    //                 return res.failure(err);
    //             }
    //             return res.page(mapper.activity.toSearchModel(result));
    //         });
    // } else {
    var myProfile = false;
    var query = {};

    query._id = req.params.id;
    query.status = 'active';

    async.waterfall([function (cb) {
        var dbQuery = db.activity
            .findOne(query)
            .populate({
                path: 'community owner participants.profile lastUpdate.profile'
            }).exec(cb);
    }], function (err, activity) {
        if (!activity) {
            return res.failure('activity does not exist');
        }

        res.data(mapper.activity.toModel(activity));
    });
    // }

};

// GET activities
exports.search = function (req, res) {
    var myProfile = req.profile;
    var dbQuery;
    var query = {};

    query = {
        status: {
            $ne: 'deleted'
        }
    };

    if (req.query.isPublic) {
        if (req.query.isPublic === "true") {
            query.isPublic = true;
        } else {
            query.isPublic = false;
        }

    }

    if (req.query.isDefault) {
        if (req.query.isDefault === "true") {
            query.isDefault = true;
        } else {
            query.isDefault = false;
        }
    }


    if (req.query.mineOnly === "true" || req.query.today === "true") {
        var getActivities = _.filter(myProfile.activities, function (item) {
            return item.status === 'active' || 'invited';
        });

        query._id = {
            $in: _.pluck(getActivities, 'activity')
        };

        if (req.query.today === "true") {
            var fromDate = moment().set('hour', 0).set('minute', 0).set('second', 0).set('millisecond', 0)._d,
                toDate = moment().set('hour', 0).set('minute', 0).set('second', 0).set('millisecond', 0).add(1, 'day')._d;
            query.dueDate = {
                $gte: fromDate,
                $lte: toDate
            };
        }

    }

    if (req.query.communityId) {
        query.community = {
            $eq: req.query.communityId
        };
    }



    dbQuery = req.query.isPublic || req.query.isDefault ?
        db.activity.find(query).sort({ 'updated_At': -1 }) :
        db.activity.find(query);


    dbQuery
        .populate('participants.profile owner community lastUpdate.profile')
        .exec(function (err, activities) {
            if (err) {
                return res.failure(err);
            }
            res.page(mapper.activity.toSearchModel(activities));
        });
};

exports.myClassActivities = function (req, res) { // for employeee
    var myProfile = req.profile;

    var query = {
        isPublic: false,
        isDefault: true
    };
    query['members.profile'] = {
        $eq: req.profile.id
    };
    query.subject = {
        $ne: 'Staff Room'
    };



    if (req.profile.type !== "employee") {
        return res.failure('you are not employee');
    }

    db.community.find(query)
        .populate({
            path: 'activities',
            select: 'subject body type icon picUrl dueDate'
        })
        .sort({ 'updated_At': -1 })
        .exec()
        .then(function (communities) {
            return communities;
            // res.page(mapper.activity.toSearchModel(communities));
        })
        .then(function (communities) {
            var activities = [];
            _.each(communities, function (community) {
                _.each(community.activities, function (activity) {
                    activity.hashTag = community.subject + " " + community.body;
                });
                activities.push(community.activities);
            });
            res.page(mapper.activity.toShortModel(_.flatten(activities)));

        }).catch(function (err) {
            res.failure(err);
        });
};
