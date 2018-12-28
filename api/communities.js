'use strict';
var async = require('async');
var _ = require('underscore');
var db = require('mongoose').models;
var mapper = require('../mappers');
var notifyUpdation = require('../helpers/notifyUpdations');
var entitiesHelper = require('../helpers/entities');
var chatConfig = require('config').get('chat');
var chatClient = require('../providers/' + chatConfig.provider);
var converter = require('rss2object');
var moment = require('moment');


var whereClause = function (req) {
    var query = {};
    var orQuery = {};
    var sharedSchoolQuery = {};
    var queryArray = [];
    query.school = req.school.id;

    if (req.query.isPublic === "true" && req.query.isDefault === "true") {
        if (req.sharedSchools) {
            req.sharedSchools.forEach(school => {
                sharedSchoolQuery.isPublic = true;
                sharedSchoolQuery.isDefault = true;
                // if (req.query.isArchive === 'true') {
                //     sharedSchoolQuery.isArchive = true;
                // }
                // if (req.query.isArchive === 'false') {
                //     sharedSchoolQuery.isArchive = false;
                // }
                sharedSchoolQuery.isSubscribed = {
                    $eq: school.id
                };
                queryArray.push(sharedSchoolQuery);
                sharedSchoolQuery = {};
            });
        }
    }

    if (req.query.isArchive === 'true') {
        query.isArchive = true;
        queryArray.push(query);
    }
    if (req.query.isArchive === 'false') {
        query.isArchive = false;
        queryArray.push(query);
    }

    if (!req.profile || req.profile && req.profile.status === "waiting") {
        query.isPublic = true;
        query.isDefault = true;
        // return query;
        queryArray.push(query);
        return {$or: queryArray};
    }

    // query.isStaff = false;

    // if (req.profile.type === "employee") {
    //     query.isStaff = true;
    // }

    if (req.profile.type === "admin") {
        //todo for admin
    }

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

    if (req.query.name) {
        query.subject = {
            $regex: req.query.name,
            $options: 'i'
        };
    }

    if (req.query.interests) {
        var interests = [];

        if (_(req.query.interests).isArray()) {
            interests = req.query.interests;
        } else {
            interests.push(req.query.interests);
        }

        query.interests = {
            $all: interests
        };
    }

    if (req.query.tags) {
        var tags = [];

        if (_(req.query.tags).isArray()) {
            tags = req.query.tags;
        } else {
            tags.push(req.query.tags);
        }

        query.tags = {
            $all: tags
        };
    }


    if (req.query.mineOnly) {
        if (req.query.mineOnly === "true") { // where I am a member
            query['members.profile'] = {
                $eq: req.profile.id
            };
        } else { // discover mode
            query['members.profile'] = {
                $ne: req.profile.id
            };
        }
    }


    if (req.query.admin === "true") {

        if (req.query.admin === "true") { // where I am a member
            query.owner = {
                $eq: req.profile.id
            };
        } else { // discover mode
            query.owner = {
                $ne: req.profile.id
            };
        }
    }

    if (req.query.around) {
        query['location.coordinates'] = {
            $geoWithin: {
                $centerSphere: [req.profile.location.coordinates, req.query.around / 3963.2]
            }
        };
    }

    if (query.isDefault && !query.isPublic) { //true , false 
        // orQuery.$or = [ //to get my defaultCommunity also //staff-when teacher room or classRoom-when student
        //     { _id: req.profile.defaultCommunity }
        // ];
        //////////////HACK///////////
        //to get only default community
        orQuery.school = req.school.id;
        orQuery._id = req.profile.defaultCommunity; //to get my defaultCommunity also //staff-when teacher room or classRoom-when student

        // if (req.profile.type === 'employee') {
        //     orQuery.$or.push({ owner: req.profile.id }); //to get his/her asign classRooms 
        // }
        // orQuery.$or.push(query);
        return orQuery;

    }

    if (!query.isDefault && !query.isPublic) { //false , false 
        // query.owner = req.profile.id; //to get only those in which me as owner
        query.isPrivate = { // for isDefault =false, isPublic = false
            $ne: true
        };
    }

    queryArray.push(query);
    return {$or: queryArray};

};

var entities = function (dbCollection) {
    return {
        toEntites: function (items, callback) {
            var targetArray = [];
            async.each(items, function (item, cb) {
                var query = {};
                if (item.name) {
                    query.name = item.name;
                } else {
                    query._id = item.id || item;
                }
                dbCollection.findOne(query).exec(function (err, entity) {
                    if (entity) {
                        targetArray.push(entity);
                    }
                    cb(null);
                });
            }, function (err) {
                callback(err, targetArray);
            });
        }
    };

};
// var getDiscover = function(profile, cb) {
//     var communities = [];
//     var query = {
//         isPublic: false,
//         isDefault: false
//     };
//     query.members = {
//         profile: {
//             $ne: profile.id
//         }
//     };
//     db.community.find(query)
//         .populate('interests tags members.profile activities')
//         .exec(function(err, communities) {
//             if (err) {
//                 return cb(err);
//             }


//             cb(null, communities);
//         });
// };
var getCommunities = function (communityIds, cb) {

    db.community.find({
        _id: {
            $in: communityIds
        }
    }).populate('interests tags members.profile activities').exec(cb);
};
var getDiscussionsCount = function (community, givinDate, cb) {
    var activities = [];
    activities = _.pluck(community.activities, 'id');

    db.comment.find({
        $or: [
            {community: community.id},
            {activity: {$in: activities}}
        ],
        updated_At: {
            $gt: givinDate
        }
    }).count().exec(function (err, count) {
        if (err) {
            return cb(err);
        }
        cb(null, count);
    });
};

// var activeUserDashboard = function(req, callback) {
//     var profile = req.profile;
//     var items = [];

//     async.waterfall([
//         function(cb) {
//             var fromDate = moment().set('hour', 0).set('minute', 0).set('second', 0).set('millisecond', 0)._d,
//                 toDate = moment().set('hour', 0).set('minute', 0).set('second', 0).set('millisecond', 0).add(1, 'day')._d;
//             // var day = date.date();
//             // var month = date.month() + 1;
//             // if (day <= 9) {
//             //     day = "0" + day;
//             // }
//             // if (month <= 9) {
//             //     month = "0" + month;
//             // }
//             // var year = date.year();
//             // var todayl = year + "-" + month + "-" + day + "T00:00:00.000+05:30";
//             // var todayu = year + "-" + month + "-" + day + "T24:00:00.000+05:30";
//             db.activity.find({
//                 participants: {
//                     $elemMatch: {
//                         profile: profile.id
//                     }

//                 },
//                 dueDate: {
//                     $gte: fromDate,
//                     $lte: toDate
//                 }
//             }).exec(function(err, result) {
//                 if (err) {
//                     return cb(err);
//                 }
//                 items.push(mapper.community.toAgendaModel(result));
//                 cb(null, items);

//             });


//         },
//         function(items, cb) {
//             var query = {};
//             // if (profile.batchNo) { // its student
//             //     query.subject = profile.batchNo;
//             // }

//             // if (profile.employeeNo) { // its teacher
//             //     query.subject = "Staff Room";
//             // }

//             // query._id = profile.defaultCommunity;

//             db.community.findById(profile.defaultCommunity)
//                 .populate('interests tags members.profile activities')
//                 .exec(cb);

//         },
//         function(community, cb) {

//             items.push(mapper.community.toModel(community));
//             cb(null, items);

//         },
//         function(items, cb) {
//             if (!profile.employeeNo) {
//                 return cb(null, items);
//             }
//             db.community.findOne({
//                     members: {
//                         $elemMatch: {
//                             profile: profile.id,
//                             isModerator: true,
//                         }
//                     },
//                     isPublic: true,
//                     isDefault: false
//                 }).populate('interests tags members.profile activities')
//                 .exec(function(err, community) {
//                     if (err) {
//                         cb(err);
//                     }
//                     if (community) {
//                         items.push(mapper.dashboard.toWaitingStudents(community));
//                     }
//                     cb(null, items);

//                 });
//         },
//         function(items, cb) {
//             db.activity.find({})
//                 .sort({
//                     updated_At: -1
//                 })
//                 .populate('community activities community.tags')
//                 .exec(function(err, activities) {
//                     if (err) {
//                         cb(err);
//                     }
//                     if (activities) {
//                         items.push(mapper.dashboard.toPublicDefaultCommunities(activities));
//                     }
//                     cb(null, items);
//                 });
//         },
//         function(items, cb) {
//             if (req.params.fromDate) {
//                 getStat(req, function(result, err) {
//                     if (err) {
//                         cb(err);
//                     }
//                     items.push(mapper.dashboard.toMyCommunities(result));
//                 });
//             }
//             cb(null, items);


//         }

//     ], function(err, items) {
//         if (err) {
//             return callback(err);
//         }
//         callback(null, items);
//     });
// };

// var getStat = function(req, call) {
//     var myId = req.params.id === 'my' ? req.profile.id : req.params.id;

//     var givinDate = req.params.fromDate;
//     var myProfile = req.profile;
//     var myCommunities = [];
//     var communityBlocks = [];
//     var unreadCount = 0;

//     async.waterfall([
//         function(cb) {
//             if (req.params.option === "joined") {
//                 _.each(myProfile.communities, function(item) {
//                     if (item.status === 'active') {
//                         myCommunities.push(item.community.toString());
//                     }
//                 });
//                 getCommunities(myCommunities, cb);

//             }

//             // if (req.params.option === "discover") {
//             //     getDiscover(req.profile, function(err, communities) {
//             //         if (err) {
//             //             return call(err);
//             //         }
//             //         return call(communities);

//             //     });
//             // }

//         },
//         function(communities, cb) {
//             async.each(communities, function(community, callback) {

//                 if (moment(givinDate).isBefore(community.updated_At)) {
//                     unreadCount++;
//                 }
//                 if (!_.isEmpty(community.activities)) {
//                     _.each(community.activities, function(activity) {
//                         if (moment(givinDate).isBefore(activity.updated_At)) {
//                             unreadCount++;
//                         }
//                     });
//                 }

//                 community.unreadCount = unreadCount;
//                 unreadCount = 0;
//                 callback(null);

//             }, function(err) {
//                 if (err) {
//                     return cb(err);
//                 }
//                 cb(null, communities);
//             });
//         },

//         function(communities, cb) {
//             async.each(communities, function(community, callback) {
//                 getDiscussionsCount(community, givinDate, function(err, count) {
//                     if (err) {
//                         return callback(err);
//                     }
//                     community.unreadCount = community.unreadCount + count;

//                     callback(null);
//                 });
//             }, function(err) {
//                 if (err) {
//                     return cb(err);
//                 }
//                 cb(null, communities);
//             });

//         }
//     ], function(err, communities) {
//         if (err) {
//             return call(err);
//         }
//         return call(communities);
//     });

// };

// POST communities

var parseUrl = function (community, cb) {
    converter.url2Object(community.feedUrl, function (err, rss) {
        if (err) {
            return cb(null);
        }
        community.subject = rss.title;
        community.body = rss.description;
        if(rss.image){
            community.picUrl = rss.image.url[0];
        }
        _.each(rss.items, function (item) {
            var activity = {};
            activity.subject = item.title;
            activity.body = item.description;
            activity.link = item.url; //todo
            community.activities.push(activity);
        })
        return cb(null, community);
    });

}


exports.create = function (req, res) {
    var data = req.body;
    var myProfile = req.profile;
    var activities=[];

    var model = {
        subject: data.subject,
        icon: data.icon,
        body: data.body,
        picUrl: data.picUrl,
        picData: data.picData,
        priority: data.priority,
        isPublic: data.isPublic,
        isDefault: data.isDefault,
        isPrivate: data.isPrivate,
        isStaff: data.isStaff, //for staff room it should be true
        owner: myProfile,
        school: req.school,
        feedUrl: data.feedUrl
    };

    if (data.location) {
        model.location = {
            name: data.location.name,
            description: data.location.description,
            coordinates: data.location.coordinates
        };
    }


    async.waterfall([
        function (cb) {
            db.community.findOne({
                subject: model.subject,
                owner: myProfile.id,
                body: model.body
            }).exec(function (err, item) {

                if (err || item) {
                    if(data.feedUrl !== item.feedUrl){
                        return cb();
                    }
                    return cb(err || "community with subject " + model.subject + " already exist");
                }
                cb();
            });
        },
        function (cb) {
            if (data.feedUrl) {
                data.activities = [];
                parseUrl(data, function (err, newCommunity) {
                    if (err) {
                        cb(null, {
                            id: 21
                        });
                    }
                    model.subject = newCommunity.subject;
                    model.body = newCommunity.body;
                    model.picUrl = newCommunity.picUrl;
                    activities = newCommunity.activities;
                    cb(null, {
                        id: 21
                    });
                });
            }else{
                // todo - create group dialog id
                // chatClient.createGroup({
                //     name: model.subject
                // }, cb);

                cb(null, {
                    id: 21
                });
            }
        },
        function (chatGroup, cb) {
            var community = new db.community(model);
            community.chat = chatGroup;
            community.members.push({
                isModerator: false,
                status: 'active',
                profile: myProfile,
                date: new Date()
            });

            async.parallel({
                interests: function (cb) {
                    entities(db.interest).toEntites(data.interests, cb);
                },
                tags: function (cb) {
                    entities(db.tag).toEntites(data.tags, cb);
                },
            }, function (err, result) {
                community.interests = result.interests;
                community.tags = result.tags;

                community.save(function (err) {
                    cb(err, community);
                });
            });
        },
        function (community, cb) {
        if(activities.length >0 ){
            async.eachSeries(activities, function (activity, next) {
               var activity = new db.activity({
                    subject: activity.subject,
                    feedUrl: activity.link,
                    status: 'active',
                    school: req.school,
                    community: community,
                    owner: myProfile,
                    isPublic: community.isPublic,
                    isDefault: community.isDefault,
                });
                activity.save(function (err) {
                    if (err) {
                        next();
                    }
                    community.activities.push(activity._id);
                    myProfile.activities.push({
                        status: 'active',
                        date: new Date(),
                        activity: activity
                    });
                    next();
                });

            }, function () {
                community.save(function (err) {
                    cb(err, community);
                });
            })
        }else{
            cb(null, community);
        }
        },
        function (community, cb) {
            myProfile.communities.push({
                status: 'active',
                community: community,
                date: new Date()
            });
            myProfile.save(function (err) {
                cb(err, community);
            });
        }
    ], function (err, community) {
        if (err) {
            return res.failure(err);
        }
        res.data(mapper.community.toModel(community));
    });
};

// GET communities
// exports.search = function(req, res) {

//     if (req.profile && !req.profile.isWaiting) {
//         activeUserDashboard(req, function(err, data) {
//             if (err) {
//                 return res.failure(err);
//             }
//             res.page(data);
//         });

//     } else {
//         // if (!req.profile || req.profile.isWaiting) {

//         db.community.find(whereClause(req))
//             .sort({
//                 priority: -1
//             })
//             .populate('interests tags members.profile activities')
//             .exec(function(err, communities) {
//                 if (err) {
//                     return res.failure(err);
//                 }
//                 res.page(mapper.community.toSearchModel(communities));
//             });
//     }
//     // }

// };

exports.search = function (req, res) {
    var query = whereClause(req);

    var dbQuery = db.community.find(query); //whereClause included

    if (req.query.isPublic === 'true' && req.query.isDefault === 'true') {
        dbQuery = dbQuery.select('_id subject icon school followers activities picData picUrl status feedUrl isArchive isPublic isDefault');
    }

    dbQuery
        .sort({'updated_At': -1})
        .sort({
            priority: -1
        })
        .populate('interests school tags members.profile followers activities lastUpdate.profile')
        .populate({
            path: 'followers',
            model: 'community',
            populate: {
                path: 'activities',
                model: 'activity'
            }
        })
        .populate({
            path: 'activities.community',
            model: 'community'
        })
        .exec(function (err, communities) {
            if (err) {
                return res.failure(err);
            }
            if (req.query.mineOnly === 'false' && !_.isEmpty(req.profile.connections)) {
                var myConnections = [];
                var friendsCount = 0;

                _.each(req.profile.connections, function (connectionModel) {
                    if (connectionModel.status === 'active') {
                        myConnections.push(connectionModel.profile.toString());
                    }
                });
                _.each(communities, function (community) {
                    var communityMembers = _.pluck(community.members, 'profile');
                    _.each(communityMembers, function (member) {


                        ////////////////////////////////HACK/////////////////////////////
                        if (member === null) {
                            return;
                        }
                        ////////////////////////////////HACK/////////////////////////////


                        if (_.indexOf(myConnections, member.id) >= 0) {
                            friendsCount++;
                        }
                        return;
                    });
                    community.friendsCount = friendsCount;
                    friendsCount = 0;
                });
            }
            if (req.query.isPublic && req.query.isDefault) {
                return res.page(mapper.community.toShortModel(communities));
            }
            res.page(mapper.community.toSearchModel(communities));
        });
};


// PUT communities/{id}
exports.update = function (req, res) {
    var model = req.body;
    var activities =[];
    var schoolCode = req.headers['school-code']
    if (model.interests) {
        if (typeof (model.interests[0]) === "object") {
            model.interests = _.pluck(model.interests, 'id');
        }
    }
    if (model.followers) {
        if (typeof (model.followers[0]) === "object") {
            model.followers = _.pluck(model.followers, 'id');
        }
    }
    if (model.tags) {
        if (typeof (model.tags[0]) === "object") {
            model.tags = _.pluck(model.tags, 'id');
        }
    }
    async.waterfall([
        function (cb) {
            db.community.findOne({
                _id: req.params.id
            })
                .populate('school')
                .exec(cb);
        },
        function (community, cb){
            if (!community) {
                return cb('no records found');
            }
            if (schoolCode) {
                if (schoolCode !== community.school.code) {
                    return cb('You are not authorized');
                }
            }
            if (model.feedUrl !== community.feedUrl) {
                model.activities = [];
                parseUrl(model, function (err, newCommunity) {
                    if (err) {
                        cb(null, community);
                    }
                    activities = newCommunity.activities;
                    cb(null, community);
                });
            }else{
                cb(null, community);
            }
        },
        function (community, cb) {
            if(activities.length >0 ){
                async.eachSeries(activities, function (activity, next) {
                    var activity = new db.activity({
                        subject: activity.subject,
                        feedUrl: activity.link,
                        status: 'active',
                        school: req.school,
                        community: community,
                        isPublic: community.isPublic,
                        isDefault: community.isDefault,
                    });
                    activity.save(function (err) {
                        if (err) {
                            next();
                        }
                        community.activities.push(activity._id);
                        next();
                    });

                }, function () {
                        cb(null, community);
                })
            }else{
                cb(null, community);
            }
        },
        function (community, cb) {

            community = entitiesHelper(community)
                .set(model, ['subject', 'body', 'picUrl', 'picData', 'status', 'interests', 'tags', 'isPublic', 'isDefault', 'isFollowable', 'isArchive', 'followers', 'feedUrl', 'isPrivate', 'location']);
            db.community.find({
                subject: community.subject,
                body: community.body,
                school: req.school
            }).exec(function (err, communities) {
                if (err) {
                    return cb(err);
                }
                if (communities.length > 1) {
                    return cb('Batch Already exists');
                }
                community.save(function (err) {
                    return cb(err);
                });
            });
        },
        function (cb) {
            db.community.findOne({
                _id: req.params.id
            })
                .populate('interests tags members.profile owner activities lastUpdate.profile')
                .exec(cb);
        }
    ], function (err, community) {
        if (err) {
            return res.failure(err);
        }
        res.data(mapper.community.toModel(community));

        // var activeMembers = _.filter(community.members, function(item) {
        //     if (item.status === "active" && item.profile.id !== req.profile.id) {
        //         return item;
        //     }
        // });
        // var data = {
        //     api: 'members',
        //     action: 'updation',
        //     modelIncluded: false
        // };
        // var type = 'community';
        // async.each(activeMembers, function(item, callback) {
        //     var block = {
        //         id: item.profile.id
        //     };

        //     notifyUpdation.updation(block, data, type, community.id, function(err) {
        //         if (err) {
        //             return callback(err);
        //         }
        //     });
        // });
    });
};

exports.get = function (req, res) {

    var communityId = req.params.id === "classroom" ? req.profile.defaultCommunity : req.params.id;


    db.community.findById(communityId)
        .populate('interests tags members.profile followers owner activities lastUpdate.profile')
        .populate({
            path: 'followers',
            model: 'community',
            populate: {
                path: 'activities',
                model: 'activity'
            }
        })
        .populate({
            path: 'activities.community',
            model: 'community'
        })
        .sort({'updated_At': -1})
        .exec(function (err, community) {
            if (err) {
                return res.failure(err);
            }

            // if (req.params.id === "classroom") {
            community.getMyClass = true;
            // }
            res.data(mapper.community.toModel(community));

        });
    // }
    // if (req.params.id === "public") {
    //     db.community.find(whereClause(req))
    //         .sort({
    //             priority: -1
    //         })
    //         .populate('interests tags members.profile activities')
    //         .exec(function(err, communities) {
    //             if (err) {
    //                 return res.failure(err);
    //             }
    //             return res.page(mapper.community.toSearchModel(communities));
    //         });
    // }
    // if (req.params.id !== "classroom" && req.params.id !== "public") {
    //     db.community.findOne({
    //             _id: req.params.id
    //         })
    //         .populate('interests tags members.profile owner activities')
    //         .exec(function(err, community) {
    //             if (err) {
    //                 return res.failure("community Not Found " + err);
    //             }
    //             if (!community) {
    //                 return res.failure("community Not Found ");
    //             }
    //             return res.data(mapper.community.toModel(community));
    //         });
    // }


};

exports.communityDisplay = function (req, res) {
    var id = req.params.id;
    var date = req.params.date;
    async.waterfall([function (cb) {
        db.activity.find({
            community: id,
            updated_At: {
                $gte: date
            }
        }).exec(cb);
    }, function (activities, cb) {
        var communityDisplay = [];
        db.community.findOne({
            _id: id
        }).populate('interests tags members.profile owner activities')
            .exec(function (err, community) {
                if (err) {
                    return cb(err);
                }
                communityDisplay.push(mapper.community.toCommunityInfo(community));
                communityDisplay.push(mapper.community.toRecentActivities(activities));
                communityDisplay.push(mapper.community.toMembers(community));

                cb(null, communityDisplay);
            });
    }, function (community, cb) {
        db.activity.find({
            community: id,
            updated_At: {
                $gt: date
            },
            type: "event"
        }).populate('activities')
            .exec(function (err, activities) {
                if (err) {
                    return cb(err);
                }
                community.push(mapper.community.toUpcomingEvents(activities));
                cb(null, community);
            });
    }], function (err, community) {
        if (err) {
            return res.failure(err);
        }
        return res.page(community);
    });
};

exports.getStats = function (req, res) {
    // getStat(req, function(result, err) {
    //     if (err) {
    //         return res.failure(err);
    //     }
    //     return res.page(mapper.community.toDiscover(result));
    // });
    var myId = req.params.id === 'my' ? req.profile.id : req.params.id;

    var givinDate = req.params.fromDate;
    var myProfile = req.profile;
    var myCommunities = [];
    var communityBlocks = [];
    var unreadCount = 0;

    async.waterfall([
        function (cb) {
            // if (req.params.option === "joined") {
            _.each(myProfile.communities, function (item) {
                if (item.status === 'active' || item.status === 'invited') {
                    myCommunities.push(item.community.toString());
                }
            });

            getCommunities(myCommunities, cb);

            // }

            // if (req.params.option === "discover") {
            //     getDiscover(req.profile, function(err, communities) {
            //         if (err) {
            //             return call(err);
            //         }
            //         return call(communities);

            //     });
            // }

        },
        function (communities, cb) {
            async.each(communities, function (community, callback) {

                if (moment(givinDate).isBefore(community.updated_At)) {
                    unreadCount++;
                }

                if (!_.isEmpty(community.activities)) {
                    _.each(community.activities, function (activity) {
                        if (moment(givinDate).isBefore(activity.updated_At)) {
                            unreadCount++;
                        }
                    });
                }

                community.unreadCount = unreadCount;
                unreadCount = 0;
                callback(null);

            }, function (err) {
                if (err) {
                    return cb(err);
                }
                cb(null, communities);
            });
        },
        function (communities, cb) {
            async.each(communities, function (community, callback) {
                getDiscussionsCount(community, givinDate, function (err, count) {
                    if (err) {
                        return callback(err);
                    }
                    community.unreadCount = community.unreadCount + count;

                    callback(null);
                });
            }, function (err) {
                if (err) {
                    return cb(err);
                }
                cb(null, communities);
            });

        }
    ], function (err, communities) {
        if (err) {
            return res.failure(err);
        }
        res.page(mapper.community.toDiscover(communities));
    });
};

exports.getMyClassRooms = function (req, res) {


    var query = {
        isPublic: false,
        isDefault: true,
    };
    query.subject = {
        $ne: 'Staff Room'
    };
    query['members.profile'] = {
        $eq: req.profile.id
    };

    db.community.find(query)
        .sort({'updated_At': -1})
        .sort({
            priority: -1
        })
        .populate('activities')
        .exec(function (err, communities) {
            if (err) {
                return res.failure(err);
            }

            res.page(mapper.community.toShortModel(communities));
        });
};