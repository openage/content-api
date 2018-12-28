'use strict';
var async = require('async');
var _ = require('underscore');
var db = require('mongoose').models;
var mapper = require('../mappers');
var notifyUpdation = require('../helpers/notifyUpdations');
var entitiesHelper = require('../helpers/entities');
var chatConfig = require('config').get('chat');
var chatClient = require('../providers/' + chatConfig.provider);
var ObjectID = require("mongodb").ObjectID;
var notificationService = require('../services/notification');
var dbQuery = require('../helpers/dbQuery');
var auth = require('../middleware/authorization');


var notify = function (hisProfile, requestingProfile, hasChanged, action, type, cb) {
    if (hasChanged) {
        notificationService.notify(hisProfile, {
            entity: {
                id: requestingProfile.id,
                type: type
            },
            api: 'admin',
            action: action
        }, function () {
            cb(null);
        });
    } else {
        cb(null);
    }
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
exports.create = function (req, res) {
    res.data(req.query.fileUrl);
};

exports.search = function (req, res) {
    var user = req.profile;
    async.waterfall([
            function (cb) { //get batch from community
                db.community.findOne({_id: user.defaultCommunity})
                    .populate('interests tags members.profile owner activities')
                    .exec(function (err, batch) {
                        if (err) {
                            return cb(err);
                        }
                        cb(null, batch);
                    });
            }

        ],
        function (err, batch) {
            if (err) {
                return res.failure(err);
            }
            res.page(mapper.community.toModel(batch));
        });
};
exports.getStatus = function (req, res) {
    var query = {};
    switch (req.params.id) {
        case "students":
            query.isDefault = false;
            query.isPublic = true;
            async.waterfall([
                    function (cb) {
                        var counts = {};

                        query.status = "waiting";
                        db.community.count(query, function (err, count) {
                            if (err) {
                                return cb(err);
                            }
                            counts.waiting = count;
                            cb(null, counts);

                        });
                    },
                    function (counts, cb) {
                        query.status = "active";
                        db.community.count(query, function (err, count) {
                            if (err) {
                                return cb(err);
                            }
                            counts.active = count;
                            cb(null, counts);

                        });
                    },
                    function (counts, cb) {
                        query.muted = true;
                        db.community.count(query, function (err, count) {
                            if (err) {
                                return cb(err);
                            }
                            counts.muted = count;
                            cb(null, counts);

                        });
                    },
                    function (counts, cb) {
                        query.deactivated = true;
                        db.community.count(query, function (err, count) {
                            if (err) {
                                return cb(err);
                            }
                            counts.deactivated = count;
                            cb(null, counts);

                        });
                    }
                ],
                function (err, counts) {
                    if (err) {
                        return res.failure(err);
                    }
                    return res.data(mapper.admin.toStatusModel(counts));
                });
            break;
        case "employees":
            query.isDefault = true;
            query.isPublic = true;
            async.waterfall([
                    function (cb) {
                        var counts = {};

                        query.status = "waiting";
                        db.community.count(query, function (err, count) {
                            if (err) {
                                return cb(err);
                            }
                            counts.waiting = count;
                            cb(null, counts);

                        });
                    },
                    function (counts, cb) {
                        query.status = "active";
                        db.community.count(query, function (err, count) {
                            if (err) {
                                return cb(err);
                            }
                            counts.active = count;
                            cb(null, counts);

                        });
                    },
                    function (counts, cb) {
                        query.muted = true;
                        db.community.count(query, function (err, count) {
                            if (err) {
                                return cb(err);
                            }
                            counts.muted = count;
                            cb(null, counts);

                        });
                    },
                    function (counts, cb) {
                        query.deactivated = true;
                        db.community.count(query, function (err, count) {
                            if (err) {
                                return cb(err);
                            }
                            counts.deactivated = count;
                            cb(null, counts);

                        });
                    }
                ],
                function (err, counts) {
                    if (err) {
                        return res.failure(err);
                    }
                    return res.data(mapper.admin.toStatusModel(counts));
                });
            break;
        default:
            res.failure("status not found");
    }

};
exports.getStudentsStatus = function (req, res) {
    var courseId = req.params.courseId;

    // if (req.profile.type !== "admin") {
    //     return res.failure('access denied');
    // }

    db.course.findById(courseId)
        .populate({
            path: 'batches.batch',
            model: 'community',
            populate: {
                path: 'owner',
                model: 'profile'
            }
        })
        .exec(function (err, course) {
            if (err) {
                return res.failure(err);
            }
            if (_.isEmpty(course.batches)) {
                return res.failure("batches not found");
            }
            res.page(mapper.admin.toClassRoom(_.pluck(course.batches, 'batch')));
        });
};

exports.getClassMembers = function (req, res) {
    var type = req.query.type ? req.query.type : 'student';
    if (req.query.type === 'student') {
        async.parallel({
                count: function (cb) {
                    db.profile.find({
                        defaultCommunity: req.params.batchId,
                        type: req.query.type
                    })
                        .count()
                        .exec(function (err, count) {
                            if (err) {
                                return res.failure(err);
                            }
                            cb(null, count);
                        });
                },
                profiles: function (cb) {
                    db.profile.find({
                        defaultCommunity: req.params.batchId,
                        type: req.query.type
                    })
                        .populate({
                            path: 'defaultCommunity',
                            model: 'community'
                        })
                        .limit(parseInt(req.query.pageSize))
                        .skip(parseInt(req.query.pageNo - 1) * parseInt(req.query.pageSize))
                        .exec(function (err, profiles) {
                            if (err) {
                                return res.failure(err);
                            }
                            cb(null, profiles);
                        })
                }
            },
            function (err, results) {
                if (err) {
                    return res.failure(err);
                }
                var mapperData = mapper.admin.toClassStudents(results.profiles);
                mapperData.pageNo = parseInt(req.query.pageNo);
                mapperData.pageSize = parseInt(req.query.pageSize);
                mapperData.totalRecords = results.count;
                res.data(mapperData);
            });

    } else {
        db.community.findById(req.params.batchId)
            .select('members owner')
            .populate({
                path: 'members.profile',
                model: 'profile'
            })
            .exec(function (err, batch) {
                if (err) {
                    return res.failure(err);
                }

                res.data(mapper.admin.toClassMembers(batch, type));
            });

    }

    // if (req.profile.type !== "admin") {
    //     return res.failure('access denied');
    // }

};
// exports.muteUser = function(req, res) {
//     var model = req.body;
//     // var profile = req.profile;
//     // if (!profile.employeeNo) {
//     //     return res.failure('Access Denied');
//     // }
//     // db.community.update({
//     //         _id: req.params.id,
//     //         "members.profile": model.profile.id
//     //     }, {
//     //         $set: {
//     //             "members.$.muted": model.mute
//     //         }
//     //     },
//     //     function(err, community) {
//     //         if (err) {
//     //             return res.failure(err);
//     //         }
//     //         if (model.mute === false) {
//     //             return res.success("unmuted succesfuly");
//     //         }
//     //         return res.success("muted succesfuly");
//     //     });

//     if (req.profile.type !== "admin") {
//         return res.failure('access denied');
//     }

//     dbQuery.updateCommunity({
//         profileId: req.body.profileId,
//         communityId: req.params.id,
//         set: {
//             $set: {
//                 'members.$.muted': model.mute
//             }
//         }
//     }, function(err) {
//         if (err) {
//             return res.failure(err);
//         }
//         if (model.mute === false) {
//             return res.success("unmuted succesfuly");
//         }
//         return res.success("muted succesfuly");
//     });
// };

var updateComm = function (req, res, dbQuery, setData) {
    var status, profileChange = false;
    if (setData['members.$.status']) {
        profileChange = true;
        status = setData['members.$.status'];
    }

    async.waterfall([
        function (cb) {
            dbQuery.updateCommunity({
                profileId: req.body.profileId,
                communityId: req.params.id,
                set: {
                    $set: setData
                }
            }, function (err) {
                if (err) {
                    return cb(err);
                }
                return cb(null);
            });

        },
        function (cb) {
            if (!profileChange) {
                return cb(null);
            }
            db.profile.findOneAndUpdate({
                _id: req.body.profileId
            }, {
                $set: {
                    status: status //will active , rejected , waiting
                }
            })
                .then(function () {
                    return cb(null);
                })
                .catch(function (err) {
                    return cb(err);
                });
        }
    ], function (err) {
        if (err) {
            return res.failure(err);
        }
        //  return res.data(mapper.community.toModel(community));
        return res.success('Member Updated')
    })

};
exports.updateMember = function (req, res) {
    var studentModeratorCount = 0,
        employeeModeratorCount = 0;
    // if (req.profile.type === 'student') {
    //     return res.failure('Access Denied');
    // }

    var model = req.body;
    var setData = {};

    if (model.deactivated) {
        if (model.deactivated === "true") {
            model.deactivated = true;
        } else {
            model.deactivated = false;
        }

        setData['members.$.deactivated'] = model.deactivated;
    }

    if (model.muted) {
        if (model.muted === "true") {
            model.muted = true;
        } else {
            model.muted = false;
        }
        setData['members.$.muted'] = model.muted;
    }

    if (model.isModerator === true || model.isModerator === false) {
        if (model.type === 'employee') {
            setData['owner'] = model.profileId;
        }
        setData['members.$.isModerator'] = model.isModerator;
    }
    if (model.status) {
        setData['members.$.status'] = model.status;
    }
    if (model.isModerator === false || model.isModerator === true) {
        db.community.findOne({
            _id: req.params.id,
        }).populate({
            path: 'members.profile',
            model: 'profile'
        })
            .exec(function (err, community) {
                if (model.isModerator) {
                    community.members.forEach(function (member) {
                        if (member.isModerator) {
                            if (member.profile.type.toLowerCase() === 'student') {
                                studentModeratorCount++;
                            }
                            if (member.profile.type.toLowerCase() === 'employee') {
                                employeeModeratorCount++;
                            }
                        }
                    });
                    if (model.type === 'student') {
                        if (studentModeratorCount >= 1) {
                            return res.failure("batch have only 1 monitor");
                        }
                    }
                    if (model.type === 'employee') {
                        if (employeeModeratorCount >= 1) {
                            return res.failure("batch have only 1 moderator");
                        }
                    }
                }
                updateComm(req, res, dbQuery, setData);
            });
    } else {
        updateComm(req, res, dbQuery, setData);
    }


};
exports.getMembersByStatus = function (req, res) {

    // if (req.profile.type !== "admin") {
    //     return res.failure('access denied');
    // }
    var status = req.params.status;
    var type = req.params.type;
    var query = {
        type: type,
        status: status,
        isPublic: false,
    };

    query['school.code'] = req.headers['school-code'];
    // if (type === "employees") {
    //     query.isDefault = true;
    //     query.isPublic = true;
    // }
    // if (type === "students") {
    //     query.isDefault = false;
    //     query.isPublic = true;
    // }
    db.profile.find(query)
        .exec(function (err, profiles) {
            if (err) {
                return res.failure(err);
            }
            res.page(mapper.profile.toSearchModel(profiles));
            // if (option === "waiting") {
            //     return res.page(mapper.admin.waitingMembers(commnities));
            // }
            // if (option === "active") {
            //     return res.page(mapper.admin.activeMembers(commnities));
            // }
            // if (option === "muted") {
            //     return res.page(mapper.admin.mutedMembers(commnities));
            // }
            // if (option === "deactivated") {
            //     return res.page(mapper.admin.deactivedMembers(commnities));
            // }

        });
};
// exports.getPublicCommunities = function(req, res) {
//     db.community.find({
//             isPublic: false,
//             isDefault: false
//         }).populate('interests tags members.profile activities')
//         .exec(function(err, items) {
//             if (err) {
//                 return res.failure(err);
//             }
//             res.page(items);
//         });
// };

exports.activateProfile = function (req, res) { //done by owner of community

    var body = req.body;

    if (body.status !== "active" && body.status !== "rejected" && body.status !== "waiting" && body.status !== "mute") {
        return res.failure(`enter valid status like active or rejected or waiting or mute`);
    }

    var classRoom = req.params.communityId; //community
    async.waterfall([
        function (cb) {
            db.community.findById(classRoom, function (err, community) {
                if (err) {
                    return cb(err);
                }
                if (req.profile.type === 'admin') {
                    return cb(null);
                }
                if (community.owner.toString() !== req.profile.id) {
                    return cb(err || 'can only accept by community owner only');
                }
                cb(null);
            });
        },
        function (cb) {
            db.profile.findOneAndUpdate({
                _id: body.profileId
            }, {
                $set: {
                    status: body.status //will active , rejected , waiting
                }
            })
                .then(function () {
                    cb(null);
                })
                .catch(function (err) {
                    cb(err);
                });
        },
        function (cb) {
            dbQuery.updateCommunity({
                profileId: body.profileId,
                communityId: classRoom,
                set: {
                    $set: {
                        'members.$.status': body.status //will active , rejected 
                    }
                }
            }, function (err) {
                if (err) {
                    return cb(err);
                }
                cb(null);
            });
        },
        function (cb) {
            notify(body.profileId, req.profile, true, body.status, req.profile.type, cb);
        }
    ], function (err) {
        if (err) {
            return res.failure(err);
        }
        res.success(`${body.status} successfully`);
    });
};

exports.assignClassRoom = function (req, res) {

    // if (req.profile.type !== "admin") {
    //     return res.failure('access denied');
    // }
    var profileExists = false;
    var classRoom = req.params.communityId;
    var communityMember = {
        isModerator: false,
        status: 'active',
        profile: req.body.profileId,
        date: new Date()
    };
    async.waterfall([
        function (cb) {
            db.community.findById(classRoom, function (err, community) {
                if (err || community.isStaff) {
                    return cb(err || 'can not assign in staff room');
                }

                community.members.forEach(function (member) {
                    if (member.profile.toString() === req.body.profileId) {
                        profileExists = true;
                    }
                });
                if (profileExists) {
                    return cb('Member is Already in this Batch');
                } else {
                    cb(null, community);
                }
            });
        },

        // when profile already exist in community then ???
        function (community, cb) {
            db.profile.findOne({
                _id: req.body.profileId
            }, function (err, profile) {
                if (err || profile.status !== "active") {
                    return cb(err || 'profile is in ' + profile.status);
                }
                cb(null, community, profile);
            });

        },
        function (community, profile, cb) {

            var memberCommunity = {
                status: 'active',
                community: classRoom,
                date: new Date()
            };

            profile.communities.push(memberCommunity);
            profile.save(function (err, profile) {
                if (err) {
                    return cb(err);
                }
                cb(null, community, profile);
            });
        },

        function (community, profile, cb) {
            // var updateMe = {
            //     $addToSet: {
            //         members: communityMember
            //     }
            // };
            // if (req.body.makeOwner) {
            //     updateMe.$set = {
            //         owner: profile //setting owner of classroom
            //     };
            // }
            community.members.push(communityMember);
            community.save(function (err, community) {
                if (err) {
                    return cb(err);
                }
                cb(null);
            })

            // db.community.findOneAndUpdate({
            //     _id: classRoom
            // }, updateMe, function(err) {
            //     if (err) {
            //         return res.failure(err);
            //     }
            //     cb(null);
            // });
        }
    ], function (err) {
        if (err) {
            return res.failure(err);
        }

        res.success('asign successfully');
    });

};

exports.removeMeFromClassroom = function (req, res) {

    // if (req.profile.type !== "admin") {
    //     return res.failure('access denied');
    // }

    var classRoom = req.params.communityId;
    db.community.findOneAndUpdate({
        _id: classRoom
    }, {
        $pull: {
            members: {profile: req.profile.id}
        }
    }, function (err) {
        if (err) {
            return res.failure(err);
        }

        res.success('asign successfully');
    });

};

exports.createBatch = function (req, res) {
    var data = req.body;
    var model = {
        subject: data.subject,
        body: data.body,
        isPublic: false,
        isDefault: true,
        isStaff: false, //for staff room it should be true
        owner: data.owner,
        school: req.school
    };
    async.waterfall([
        function (cb) {
            db.course.findOne({
                _id: data.course,
            }).exec(function (err, course) {
                if (err) {
                    return cb(err);
                }
                model.body = course.name;
                cb(null, course);
            });
        },
        function (course, cb) {
            db.profile.findOne({
                _id: model.owner,
            }).exec(function (err, profile) {
                if (err || profile.status !== "active") {
                    return cb(err || 'profile is in ' + profile.status);
                }
                cb(null, course, profile);
            });
        },
        function (course, profile, cb) {
            // todo - create group dialog id
            // chatClient.createGroup({
            //     name: model.subject
            // }, cb);

            cb(null, course, profile, {
                id: 21
            });
        },
        function (course, profile, chatGroup, cb) {
            db.community.findOne({
                subject: model.subject,
                body: model.body
            }).exec(function (err, community) {
                if (community) {
                    return res.failure('Community Already Exists');
                }
                if (err) {
                    return cb(err);
                }
                var batch = new db.community(model);
                batch.chat = chatGroup;
                batch.members.push({
                    isModerator: false,
                    status: 'active',
                    profile: profile,
                    date: new Date()
                });
                batch.save(function (err) {
                    cb(err, profile, course, batch);
                });
            });
        },
        function (profile, course, community, cb) {
            var newBatch = {
                name: model.subject,
                status: 'active',
                batch: community
            };
            course.batches.push(newBatch);
            course.save();
            profile.communities.push({
                status: 'active',
                community: community,
                date: new Date()
            });
            profile.save(function (err) {
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

exports.makeOwner = function (req, res) {

    // if (req.profile.type !== "admin") {
    //     return res.failure('access denied');
    // }
    var setData = {};
    var model = req.body;
    setData['owner'] = model.profileId;
    setData['members.$.isModerator'] = model.isModerator;
    var profileExists = false;
    var moderatorExists = false;
    var classRoom = req.params.communityId;
    var communityMember = {
        isModerator: req.body.isModerator,
        status: 'active',
        profile: req.body.profileId,
        date: new Date()
    };
    async.waterfall([
        function (cb) {
            db.community.findOne({
                _id: req.params.communityId
            }).populate({
                path: 'members.profile',
                model: 'profile'
            })
                .exec(function (err, community) {
                    community.members.forEach(function (member) {
                        if (member.profile.type.toLowerCase() === 'employee') {
                            if (member.isModerator) {
                                moderatorExists = true;
                            }
                        }

                        if (member.profile.toString() === req.body.profileId) {
                            profileExists = true;
                        }
                    });
                    if (moderatorExists) {
                        return cb('Batch Can Have only 1 Moderaotr');
                    }
                    cb(null, community);
                });
        },
        // when profile already exist in community then ???
        function (community, cb) {
            db.profile.findOne({
                _id: req.body.profileId
            }, function (err, profile) {
                if (err || profile.status !== "active") {
                    return cb(err || 'profile is in ' + profile.status);
                }
                cb(null, community, profile);
            });
        },
        function (community, profile, cb) {
            if (profileExists) {
                dbQuery.updateCommunity({
                    profileId: req.body.profileId,
                    communityId: req.params.id,
                    set: {
                        $set: setData
                    }
                }, function (err) {
                    if (err) {
                        return cb(err);
                    }
                    return cb(null);
                });
            } else {
                community.owner = req.body.profileId
                community.members.push(communityMember);
                community.save(function (err, community) {
                    if (err) {
                        return cb(err);
                    }
                    cb(null);
                });
            }
        }
    ], function (err) {
        if (err) {
            return res.failure(err);
        }
        return res.success('asign successfully');
    })
}

// exports.createSharedCommunity = function(req, res) {
//     var data = req.body;
//     var myProfile = req.profile;

//     var model = {
//         subject: data.subject,
//         icon: data.icon,
//         body: data.body,
//         picUrl: data.picUrl,
//         picData: data.picData,
//         priority: data.priority,
//         isPublic: data.isPublic,
//         isDefault: data.isDefault,
//         isStaff: data.isStaff, //for staff room it should be true
//         owner: myProfile,
//         school: req.school
//     };

//     if (data.location) {
//         model.location = {
//             name: data.location.name,
//             description: data.location.description,
//             coordinates: data.location.coordinates
//         };
//     }

//     async.waterfall([
//         function(cb) {
//             if (!data.orgCode) {
//                 cb('orgCode is required');
//             }
//             db.community.findOne({
//                 subject: model.subject,
//                 owner: myProfile.id,
//                 body: model.body
//             }).exec(function(err, item) {
//                 if (err || item) {
//                     return cb(err || "community with subject " + model.subject + " already exist");
//                 }
//                 cb();
//             });
//         },
//         function(cb) {
//             // todo - create group dialog id
//             // chatClient.createGroup({
//             //     name: model.subject
//             // }, cb);

//             cb(null, {
//                 id: 21
//             });
//         },
//         function(chatGroup, cb) {
//             var community = new db.community(model);
//             community.chat = chatGroup;
//             community.members.push({
//                 isModerator: false,
//                 status: 'active',
//                 profile: myProfile,
//                 date: new Date()
//             });

//             async.parallel({
//                 interests: function(cb) {
//                     entities(db.interest).toEntites(data.interests, cb);
//                 },
//                 tags: function(cb) {
//                     entities(db.tag).toEntites(data.tags, cb);
//                 },
//             }, function(err, result) {
//                 community.interests = result.interests;
//                 community.tags = result.tags;

//                 community.save(function(err) {
//                     cb(err, community);
//                 });
//             });
//         },
//         function(community, cb) {
//             db.school.find({
//                 orgCode: data.orgCode,
//             }).exec(function(err, schools) {
//                 if (err || schools) {
//                     if (community.isPublic === true && community.isDefault === true) {
//                         schools.forEach(function(school) {
//                             community.isSubscribed.push({
//                                 school: school
//                             });
//                         });
//                         community.save(function(err) {
//                             cb(err, community);
//                         });
//                     } else {
//                         cb(null, community);
//                     }
//                 } else {
//                     cb(null, community);
//                 }
//             });
//         },
//         function(community, cb) {
//             myProfile.communities.push({
//                 status: 'active',
//                 community: community,
//                 date: new Date()
//             });
//             myProfile.save(function(err) {
//                 cb(err, community);
//             });
//         }
//     ], function(err, community) {
//         if (err) {
//             return res.failure(err);
//         }
//         res.data(mapper.community.toModel(community));
//     });
// };
exports.publicDashboard = function (req, res) {
    var data = req.body;
    var communityId = req.params.communityId;
    db.community.findOne({
        _id: communityId
    }).exec(function (err, item) {
        if (err || item) {
            item.isPublic = data.isPublic;
            item.isDefault = data.isDefault;
            item.save(function (err) {
                res.data(mapper.community.toModel(item));
            });
        } else {
            res.failure('community not found');
        }
    });
};

exports.shareCommunitySchool = function (req, res) {
    var data = req.body;
    var communityId = req.params.communityId;

    async.waterfall([
        function (cb) {
            db.community.findOne({
                _id: communityId,
            }).exec(function (err, item) {
                if (err || item) {
                    return cb(null, item);
                } else {
                    cb('community not found');
                }
            });
        },
        function (community, cb) {
            var schoolExists = false;
            db.school.find({
                orgCode: data.orgCode,
            }).exec(function (err, schools) {
                if (err || schools) {
                    if (community.isPublic === true && community.isDefault === true) {
                        schools.forEach(function (school) {
                            community.isSubscribed.forEach(sharedSchool => {
                                if (school.id === sharedSchool.toString()) {
                                    schoolExists = true;
                                }
                            });
                            if (!schoolExists) {
                                community.isSubscribed.push(school);
                            }
                            schoolExists = false;
                        });
                        community.save(function (err) {
                            cb(err, community);
                        });
                    } else {
                        cb('isPublic and isDefault must be true');
                    }
                } else {
                    cb(null, community);
                }
            });
        }
    ], function (err, community) {
        if (err) {
            return res.failure(err);
        }
        res.data(mapper.community.toModel(community));
    });
};


exports.sharedProfile = function (req, res) {
    var data = req.body;
    var id = req.params.profileId;
    db.profile.findOneAndUpdate({
        _id: id
    }, {
        isPublic: data.isPublic
    })
        .exec(function (err, profile) {
            if (err) {
                return res.failure(err);
            }
            return res.data(mapper.profile.toModel(profile));
        });
};

exports.shredProfileSchool = function (req, res) {
    var data = req.body;
    var id = req.params.profileId;
    async.waterfall([
        function (cb) {
            db.profile.findOne({
                _id: id
            }).exec(function (err, item) {
                if (err || item) {
                    return cb(null, item);
                } else {
                    cb('profile not found');
                }
            });
        },
        function (profile, cb) {
            var schoolExists = false;
            db.school.find({
                orgCode: data.orgCode,
            }).exec(function (err, schools) {
                if (err || schools) {
                    if (profile.isPublic === true) {
                        schools.forEach(function (school) {
                            profile.isSubscribed.forEach(sharedSchool => {
                                if (school.id === sharedSchool.toString()) {
                                    schoolExists = true;
                                }
                            });
                            if (!schoolExists) {
                                profile.isSubscribed.push(school);
                            }
                            schoolExists = false;
                        });
                        profile.save(function (err) {
                            cb(err, profile);
                        });
                    } else {
                        cb('profile must be isPublic');
                    }
                } else {
                    cb(null, profile);
                }
            });
        }
    ], function (err, profile) {
        if (err) {
            return res.failure(err);
        }
        res.data(mapper.profile.toModel(profile));
    });
};

// exports.sharedCommunity = function(req, res) {
//     var data = req.body;
//     async.waterfall([
//         function(cb) {
//             db.community.findOne({
//                 _id: data.id
//             }).exec(function(err, item) {
//                 if (err || item) {
//                     return cb(null, item);
//                 } else {
//                     cb('community not found');
//                 }
//             });
//         },
//         function(community, cb) {
//             db.school.find({
//                 orgCode: data.orgCode,
//             }).exec(function(err, schools) {
//                 if (err || schools) {
//                     if (community.isPublic === true && community.isDefault === true) {
//                         schools.forEach(function(school) {
//                             community.isSubscribed.push({
//                                 school: school
//                             });
//                         });
//                         community.save(function(err) {
//                             cb(err, community);
//                         });
//                     } else {
//                         cb(null, community);
//                     }
//                 } else {
//                     cb(null, community);
//                 }
//             });
//         }
//     ], function(err, community) {
//         if (err) {
//             return res.failure(err);
//         }
//         res.data(mapper.community.toModel(community));
//     });
// };


exports.membersInStaffRoom = function (req, res) {
    var schoolCode = req.headers['school-code'];
    var type = req.params.type;
    var school;

    async.waterfall([
        function (cb) {
            db.profile.find({
                'type': type,
                'school.code': schoolCode
            })
                .populate('school.id')
                .exec(function (err, profiles) {
                    if (err) {
                        cb(err);
                    }
                    school = profiles[0].school
                    cb(null, profiles);
                })

        },
        function (profiles, cb) {
            db.community.findOne({
                "subject": "Staff Room",
                "school": school.id
            })
                .exec(function (err, community) {
                    if (err) {
                        return res.failure(err);
                    }
                    cb(null, profiles, community);
                })
        },
        function (profiles, community, cb) {
            async.each(profiles, function (profile, next) {
                community.members.forEach(function (member) {
                    if (member.profile.toString() === profile.id) {
                        next(null);
                    }
                });
                community.members.push({
                    isModerator: false,
                    status: 'active',
                    profile: profile,
                    date: new Date()
                });
                next(null);
            }, function (err) {
                community.save(function (err) {
                    if (err) {
                        cb(err);
                    }
                    cb(null);
                })
            })
        }], function (err) {
        if (err) {
            return res.failure(err);
        }
        return res.success('SuccessFully Moved');
    })

}

exports.courseArchive = function (req, res) {
    db.course.findOne({
        _id: req.params.id
    })
        .populate('courses')
        .exec(function (err, course) {
            if (err) {
                return res.failure(err);
            }
            course.isArchive = !req.body.isArchive;
            course.save(function (err) {
                if (err) {
                    return res.failure('Unable to Archive');
                }
                return res.success('Archived Successfullly');
            })
        });
}

exports.addFollower = function (req, res) {

    async.waterfall([
        function (cb) {
            db.community.findOne({
                _id: req.params.communityId
            })
                .exec(function (err, followCommunity) {
                    if (err) {
                        return cb(err);
                    }
                    cb(null, followCommunity)
                })
        },
        function (followCommunity, cb) {
            db.community.findOne({
                _id: req.body.id
            })
                .exec(function (err, followingCommunity) {
                    if (err) {
                        return cb(err);
                    }
                    cb(null, followCommunity, followingCommunity);
                })
        },
        function (followCommunity, followingCommunity, cb) {
            var groupExists = false;
            if (followCommunity.id.toString() === req.body.id) {
                return cb('choose different group');
            }
            followCommunity.followers.forEach(function (follower) {
                if (follower.toString() === req.body.id) {
                    groupExists = true;
                }
            })
            if (groupExists) {
                return cb('group already exists');
            }
            return cb(null, followCommunity, followingCommunity);
        },
        function (followCommunity, followingCommunity, cb) {
            async.parallel({
                follow: function (callback) {
                    followCommunity.followers.push(req.body.id);
                    followCommunity.save(function (err) {
                        callback(null, followCommunity);
                    })
                },
                following: function (callback) {
                    followingCommunity.following.push(req.params.communityId);
                    followingCommunity.save(function (err) {
                        callback(null, followingCommunity);
                    })
                }
            }, function (err, results) {
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
        return res.success('updated');
    });
}

exports.unFollow = function (req, res) {

    async.waterfall([
        function (cb) {
            db.community.findOne({"_id": req.params.id})
                .exec(function (err, followCommunity) {
                    if (err) {
                        return cb(err);
                    }
                    req.body.forEach(function (item) {
                        followCommunity.followers.forEach(function (element) {
                            if (element.toString() === item) {
                                var index = followCommunity.followers.indexOf(item);
                                if (index !== -1) {
                                    followCommunity.followers.splice(index, 1);
                                    console.log(followCommunity.followers);
                                    followCommunity.save();
                                }
                            }
                        })
                    });

                    return cb(null, followCommunity);
                })

        },
        function (followCommunity, cb) {
            async.eachSeries(req.body, function (item, next) {
                db.community.findOne({"_id": item})
                    .exec(function (err, followingCommunity) {
                        if (err) {
                            next();
                        }
                            followingCommunity.following.forEach(function(element) {
                                if (element.toString() === req.params.id) {
                                    var index = followingCommunity.following.indexOf(req.params.id);
                                    if (index !== -1) {
                                        followingCommunity.following.splice(index, 1);
                                        console.log(followingCommunity.following);
                                        followingCommunity.save();
                                    }
                                }
                            });
                       next();
                    })
            }, function (err) {
                if (err) {
                    cb(err);
                }
                cb(null);
            })

        }
    ], function (err) {
        if (err) {
            return res.failure(err);
        }
        return res.success();
    })


}

exports.FollowableGroups = function (req, res) {


    db.community.find({
        isFollowable: req.query.isFollowable,
        school: req.query.school
    })
        .exec(function (err, communities) {
            if (err) {
                return res.failure(err);
            }
            res.page(mapper.community.toSearchModel(communities));
        })

}

var getDefaultCommunity = function (communityId, profile, callback) {

    var communityMember = {
        isModerator: false,
        status: 'waiting',
        profile: profile.id,
        date: new Date()
    };
    var query = {};

    query.school = profile.school.id;

    if (communityId) {
        query._id = communityId; // for student
        profile.type = 'student';
    } else {
        query.subject = { // for employee
            $regex: /staff/,
            $options: 'i'
        };
        profile.type = 'employee';
    }


    db.community.findOneAndUpdate(query, {
        $addToSet: {
            members: communityMember
        }
    }, function (err, community) {
        if (err) {
            return callback(err);
        }

        // if (!community) {
        //     profile.type = 'admin';
        //     //profile.status TODO for admin status
        // } else {
        profile.defaultCommunity = community.id;
        // }

        callback(null, profile);
    });
};


var createUser = function (data, school, callback) {
    async.waterfall([
        function (cb) {
            chatClient.createUser({id: data.phone || data.facebookId, name: data.name}, cb);
        },
        function (chatUser, cb) {
            var user = {
                phone: data.phone,
                facebookId: data.facebookId,
                password: data.password,
                status: 'new',
                chat: {
                    id: chatUser.id,
                    password: chatUser.password
                }
            };
            if (data.device) {
                user.device = {
                    id: data.device.id
                };
            }
            (new db.user(user)).save(function (err, user) {
                if (err) {
                    cb(err);
                } else {
                    cb(null, user);
                }
            });
        },
        function (user, cb) {
            var profile = {
                name: data.name,
                code: data.code,
                user: user,
                status: 'waiting',
                school: {
                    code: school.code,
                    id: school.id,
                },
                chat: {
                    id: user.chat.id
                }
            };
            async.waterfall([
                function (callMe) {
                    new db.profile(profile).save(function (err, profile) {
                        if (err) {
                            return callMe(err);
                        }
                        callMe(null, user, profile);
                    });
                },
                function (user, profile, callMe) {
                    getDefaultCommunity(data.batchId, profile, function (err, profile) {
                        if (err) {
                            return callMe(err);
                        }
                        callMe(null, user, profile);
                    });
                },
                function (user, profile, callMe) {
                    profile.save(function (err, profile) {
                        if (err) {
                            return callMe(err);
                        }
                        callMe(null, user, profile);
                    });
                }
            ], function (err, user, profile) {
                if (err) {
                    return cb(err);
                }
                user.profile = profile;
                cb(null, user);
            });
        },
        function (user, cb) {
            user.save(function (err, item) {
                if (err) {
                    return cb(err);
                }
                cb(null, item);
            });
        }
    ], callback);
};

exports.addStudent = function (req, res) {
    async.waterfall([
            function (cb) {
                db.user.findOne({
                    phone: req.body.phone
                }).exec(function (err, user) {
                    if (err) {
                        return cb(err);
                    }
                    if (user) {
                        return cb("Phone no already exist");
                    }
                    return cb(null);
                });
            },
            function (cb) {
                createUser(req.body, req.school, cb);
            },
            function (user, cb) {
                user.status = 'active';
                user.token = auth.getToken(user);
                user.save(cb);
            }
        ],
        function (err, result) {
            if (err) {
                return res.failure(err)
            }
            return res.success('Student Added');
        })
}

exports.getStaffRoom = function (req, res) {
    var pageSize, pageNo;
    var query = {};
    query['school.code'] = req.headers['school-code'];
    if (req.query.serverPaging === 'true') {
        var pageSize = req.query.pageSize;
        var pageNo = req.query.pageNo;
    }
    if (!req.query.status) {
        query.status = {
            $nin: ["inComplete", "rejected"]
        }
    } else {
        query.status = req.query.status;
    }
    if (!req.query.type) {
        query.type = 'employee';
    } else {
        query.type = req.query.type;
    }
    if (req.query.name) {
        var value = isNaN(req.query.name);
        if (value) {
            query.name = {
                $regex: req.query.name,
                $options: 'i'
            }
        } else {
            query.code = {
                $regex: req.query.name,
                $options: 'i'
            }
        }
    }


    async.parallel({
        count: function (cb) {
            db.profile.find(query)
                .count()
                .exec(function (err, count) {
                    if (err) {
                        return cb(err);
                    }
                    return cb(null, count);
                });
        },
        profiles: function (cb) {
            db.profile.find(query)
                .limit(parseInt(pageSize))
                .skip(parseInt(pageNo - 1) * parseInt(pageSize))
                .sort({
                    code: -1
                })
                .exec(function (err, profiles) {
                    if (err) {
                        return cb(err);
                    }
                    return cb(null, profiles);
                });
        }
    }, function (err, result) {
        if (err) {
            return res.failure(err);
        }
        var items = mapper.profile.toSearchModel(result.profiles);
        items.sort(function compareNumbers(a, b) {
            return a.code - b.code;
        })
        // items = _.sortBy(items, "code");
        // items = items.reverse();
        res.page(items, result.count, parseInt(pageNo), parseInt(pageSize));
    })
};

exports.getClassRoom = function (req, res) {
    if (!req.query.type) {
        req.query.type = 'student';
    }
    var type = req.query.type ? req.query.type : 'student';
    if (req.query.type === 'student') {
        var query = {};
        if (req.query.name) {
            var value = isNaN(req.query.name);

            if (value) {
                query.name = {
                    $regex: req.query.name,
                    $options: 'i'
                }
            } else {
                query.code = {
                    $regex: req.query.name,
                    $options: 'i'
                }
            }
        }
        query.type = req.query.type;
        query.defaultCommunity = req.query.batchId;
        query.status = {
            $nin: ["inComplete", "rejected"]
        }
        async.parallel({
                count: function (cb) {
                    db.profile.find(query)
                        .count()
                        .exec(function (err, count) {
                            if (err) {
                                return res.failure(err);
                            }
                            cb(null, count);
                        });
                },
                profiles: function (cb) {
                    db.profile.find(query)
                        .populate({
                            path: 'defaultCommunity',
                            model: 'community'
                        })
                        .limit(parseInt(req.query.pageSize))
                        .skip(parseInt(req.query.pageNo - 1) * parseInt(req.query.pageSize))
                        .exec(function (err, profiles) {
                            if (err) {
                                return res.failure(err);
                            }
                            cb(null, profiles);
                        })
                }
            },
            function (err, results) {
                if (err) {
                    return res.failure(err);
                }
                var mapperData = mapper.admin.toClassStudents(results.profiles);
                mapperData.members.sort(function compareNumbers(a, b) {
                    return a.profile.code - b.profile.code;
                })
                mapperData.pageNo = parseInt(req.query.pageNo);
                mapperData.pageSize = parseInt(req.query.pageSize);
                mapperData.totalRecords = results.count;
                res.page(mapperData.members, mapperData.totalRecords, mapperData.pageNo, mapperData.pageSize);
            });

    } else {
        db.community.findById(req.query.batchId)
            .select('members owner')
            .populate({
                path: 'members.profile',
                model: 'profile'
            })
            .exec(function (err, batch) {
                if (err) {
                    return res.failure(err);
                }
                res.data(mapper.admin.toClassMembers(batch, type));
            });
    }
};

exports.updateProfile = function (req, res) {

    var model = req.body;

    async.waterfall([
        function (cb) {
            db.profile.findOne({
                _id: req.params.id
            })
                .exec(function (err, profile) {
                    if (err) {
                        return cb(err);
                    }
                    return cb(null, profile);
                })
        },
        function (profile, cb) {

            profile = entitiesHelper(profile).set(model, [
                'name',
                'picUrl',
                'picData',
                'dateOfBirth',
                'desigination',
                'course',
                'batchNo',
                'rollNo',
                'employeeNo',
                'interests',
                'tags',
                'age',
                'gender',
                'about',
                'role',
                'location',
                'status',
                'isPublic'
            ]);
            profile.save(function (err, profile) {
                if (err) {
                    return cb(err);
                }
                return cb(null);
            });
        }
    ], function (err) {
        if (err) {
            return res.failure(err);
        }
        return res.success('Profile Updated');
    })
};

exports.getMember = function (req, res) {
    var query = {};
    // query.id = req.query.batchId;
    // query['members.profile'] = {
    //     $eq: req.query.profileId
    // };
    db.community.findById({
        _id: req.body.batchId
    })
        .populate({
            path: 'members.profile',
            model: 'profile'
        })
        .exec(function (err, community) {
            if (err) {
                return res.failure(err);
            }
            var communityMember = _.find(community.members, function (item) {
                return item.profile.id.toString() === req.body.profileId;
            })
            // community.members =[];
            // community.members.push(communityMember);
            res.data(communityMember);
            // var mapperData = mapper.admin.toClassStudents(community);
            // mapperData.pageNo = parseInt(req.query.pageNo);
            // mapperData.pageSize = parseInt(req.query.pageSize);
            // mapperData.totalRecords = results.count;
            // res.page(mapperData.members, mapperData.totalRecords, mapperData.pageNo, mapperData.pageSize);
        })
}

exports.schools = function (req, res) {
    db.school.find({
        code: {$ne: req.headers['school-code']}
    }, function (err, item) {
        return res.page(item);
    });
};