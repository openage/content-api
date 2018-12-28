"use strict";
var async = require('async');
var db = require('mongoose').models;
var mapper = require('../mappers/profile');
var entitiesHelper = require('../helpers/entities');
var _ = require('underscore');
var profile = require('../api/activities');
var chatConfig = require('config').get('chat');
var chatClient = require('../providers/' + chatConfig.provider);
var notifyUpdation = require('../helpers/notifyUpdations');
var notificationService = require('../services/notification');
var dbQuery = require('../helpers/dbQuery');

var where = function(req) {
    var query = {};
    var pageSize = query.pageSize || 10;
    var pageNo = query.pageNo || 1;
    var sharedSchoolQuery = {};
    var queryArray = [];

    if (req.query.isPublic === "true") {
        req.sharedSchools.forEach(school => {
            sharedSchoolQuery.isPublic = true;
            sharedSchoolQuery.isSubscribed = {
                $eq: school.id
            };
            queryArray.push(sharedSchoolQuery);
            sharedSchoolQuery = {};
        });
    }

    query['school.id'] = {
        $eq: req.school.id
    };

    query.status = {
        $eq: "active"
    };
    query.isPublic = false;
    // if (req.query.communityId) {

    //     if (req.profile.type !== 'employee') {
    //         throw ('you are not tacher');
    //     }
    //     query.status = {
    //         $eq: "waiting"
    //     };
    //     query.defaultCommunity = req.query.communityId;
    //     return query;
    // }

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

    if (req.query.around && req.profile.location && req.profile.location.coordinates) {
        query['location.coordinates'] = {
            $geoWithin: {
                $centerSphere: [req.profile.location.coordinates, Number(req.query.around) / 3963.2]
            }
        };
    }
    // res.log.debug('query', query);
    if (req.query.isPublic === 'true') {
        query.isPublic = true;
    } else {
        query['connections.profile'] = {
            $ne: req.profile.id
        };

        query._id = {
            $ne: req.profile.id
        };
    }
    // return query;
    queryArray.push(query);
    return { $or: queryArray };
};

var notify = function(hisProfile, recipientModel, requestingProfile, hasChanged, action, cb) {
    if (hasChanged) {
        notificationService.notify(hisProfile, {
            entity: {
                id: recipientModel.id,
                type: 'recipient',
                data: recipientModel,
                requstingPerson: requestingProfile
            },
            api: 'profile/recipient',
            action: action
        }, function() {
            cb(null);
        });
    } else {
        cb(null);
    }
};

var getProfile = function(profile, cb) {
    db.profile.findOne({
        _id: profile
    }, function(err, profileModel) {
        if (err) {
            return cb(err);
        }

        return cb(null, profileModel);
    });
};

exports.invite = function(req, res) {

    var data = req.body;

    var invitations = [];

    if (data.phone) {
        invitations.push({
            phone: data.phone
        });
    }

    if (data.facebookId) {
        invitations.push({
            facebookId: data.facebookId
        });
    }

    if (data.phones) {
        _(data.phones).each(function(item) {
            invitations.push({
                phone: item
            });
        });
    }

    if (data.facebookIds) {
        _(data.facebookIds).each(function(item) {
            invitations.push({
                facebookId: item
            });
        });
    }

    async.each(invitations, function(invitee, cb) {
            async.waterfall([function(cb) {
                    db.user.findOne({
                        phone: invitee.phone
                    }, cb);
                },
                function(user, cb) {
                    if (user) {
                        return cb('user exists');
                    }

                    (new db.user({
                        status: 'invited',
                        phone: invitee.phone,
                        facebookId: invitee.facebookId
                    }))
                    .save(function(err, item) {
                        if (err) {
                            return cb(err);
                        }
                        cb(null, item);
                    });
                },
                function(user, cb) {
                    (new db.profile({
                        user: user,
                        status: 'invited',
                        invitedBy: req.profile
                    }))
                    .save(function(err, profile) {
                        if (err) {
                            return cb(err);
                        }
                        cb(null, profile, user);
                    });
                },
                function(profile, user, cb) {
                    user.profile = profile;
                    user.save(function(err, item) {
                        if (err) {
                            return cb(err);
                        }
                        cb(null, profile);
                    });
                }
            ], function(err) {
                if (err === 'user exists') {
                    cb(null); // continue to create other users,
                } else {
                    cb(err);
                }
            });
        },
        function(err) {
            if (err) {
                return res.failure(err);
            }
            return res.success();
        });
};
var userType = function(model, profile, callback) {
    if (model.batch) {
        db.community.findOne({
            _id: model.batch.id
        }).exec(function(err, community) {
            if (err) {
                return callback(err);
            }
            community.members.push({
                isModerator: false,
                status: 'waiting',
                profile: profile.id,
                date: new Date()
            });
            community.save(function(err, community) {
                if (err) {
                    return callback(err);
                }
                profile.defaultCommunity = community.id;
                profile.batchNo = model.batchNo;
                callback(null, profile);
            });
        });

    } else {
        db.community.findOne({
            subject: "Staff Room"
        }).exec(function(err, community) {
            if (err) {
                return callback(err);
            }
            community.members.push({
                isModerator: false,
                status: 'waiting',
                profile: profile.id,
                date: new Date()
            });
            community.save(function(err, community) {
                if (err) {
                    return callback(err);
                }
                profile.defaultCommunity = community.id;
                profile.emplyeeNo = model.employeeNo;
                callback(null, profile);
            });
        });
    }

};
// can update only my profile
exports.update = function(req, res) {
    var model = req.body;
    var profile = req.profile;

    if (model.interests) {
        if (typeof(model.interests[0]) === "object") {
            model.interests = _.pluck(model.interests, 'id');
        }
    }
    if (model.tags) {

        if (typeof(model.tags[0]) === "object") {
            model.tags = _.pluck(model.tags, 'id');
        }
    }
    async.waterfall([
        function(cb) {
            if (model.name && model.name !== profile.name) {
                chatClient.updateUser(profile.chat.id, {
                    full_name: req.body.name
                }, function(err) {
                    cb(err, profile);
                });
            } else {
                cb(null, profile);
            }
        },
        function(profile, cb) {
            if (!model.employeeNo) {
                return cb(null, profile);

            }

            db.profile.findOne({
                    employeeNo: model.employeeNo
                })
                .exec(function(err, result) {
                    if (err) {
                        return res.failure(err);
                    }
                    if (result) {
                        return res.failure('EmployeeNo Already Exits');
                    }
                    cb(null, profile);
                });

        },
        function(user, cb) {
            if (model.employeeNo || model.batch) {
                userType(model, profile, function(err, user) {
                    if (err) {
                        return res.failure(err);
                    }
                    cb(null, user);
                });
            } else {
                cb(null, user);

            }

        },
        function(profile, cb) {
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
                'status'
            ]);
            profile.save(function(err, profile) {
                if (err) {
                    return cb(err);
                }
                cb(null);
            });
        },
        function(cb) {
            db.profile.findOne({
                    _id: profile._id
                })
                .populate('recipients interests tags defaultCommunity')
                .exec(function(err, updatedProfile) {
                    if (err) {
                        return cb(err);
                    }
                    cb(null, updatedProfile);
                });
        }

    ], function(err, profile) {
        if (err) {
            return res.failure(err);
        }
        if (profile.type === 'student') {
            profile.course = profile.defaultCommunity.body;
        }
        profile.defaultCommunity = profile.defaultCommunity.id;
        res.data(mapper.toMyProfileModel(profile));
        // var activeConnections = _.filter(profile.connections, function(item) {
        //     if (item.status === "active") {
        //         return item;
        //     }
        // });
        // var data = {
        //     api: 'profiles',
        //     action: 'updation',
        //     modelIncluded: false
        // };
        // var type = 'profile';
        // async.each(activeConnections, function(item, callback) {
        //     var block = {
        //         id: item.profile
        //     };
        //     notifyUpdation.updation(block, data, type, profile.id, function(err) {
        //         if (err) {
        //             return callback(err);
        //         }
        //     });
        // });
    });
};

exports.get = function(req, res) {

    var myProfile = false;
    var query = {};

    if (req.params.id === 'my') {
        myProfile = true;
        query._id = req.profile._id;
    } else {
        query._id = req.params.id;
    }

    async.waterfall([function(cb) {
        var dbQuery = db.profile.findOne(query);

        if (myProfile) {
            dbQuery
                .populate({
                    path: 'interests tags communities connections',
                    select: 'name'
                })
                .populate({
                    path: 'defaultCommunity',
                    select: 'body'
                })
                .populate({
                    path: 'user',
                    select: 'phone chat status'
                });
        } else {
            dbQuery.populate({
                    path: 'interests tags connections',
                    select: 'name'
                })
                .populate({
                    path: 'user',
                    select: 'phone chat status'
                });
        }
        // dbQuery.populate('recipients connections');
        dbQuery.exec(cb);
    }], function(err, profile) {
        if (!profile) {
            return res.failure('profile does not exist');
        }
        if (myProfile) {
            if (profile.type === 'student') {
                profile.course = profile.defaultCommunity.body;
            }
            profile.defaultCommunity = profile.defaultCommunity.id;
            return res.data(mapper.toMyProfileModel(profile));
        }
        if (_(profile.loops).find(function(loop) {
                return loop.profile.id === req.profile.id;
            })) {
            return res.data(mapper.toRecipientModel(profile));
        }
        if (profile.status === "inComplete") {
            return res.failure('profile is inComplete');
        }
        res.data(mapper.toModel(profile));
    });
};

// only active and 
exports.search = function(req, res) {


    var filter = db.profile.find(where(req));
    filter
    // .populate('interests tags')
        .exec(function(err, profiles) {
        if (err) {
            return res.failure(err);
        }
        if (req.query.isPublic === 'true') {
            return res.page(mapper.discoverPublicProfiles(profiles));
        }
        res.page(mapper.toSearchModel(profiles));
    });


};

exports.getMyWaiters = function(req, res) {

    var profile = req.profile;

    // for admin and employee
    if (profile.type === 'student') {
        return res.failure('you are not employee');
    }
    if (profile.status !== 'active') {
        return res.failure('you status is ' + profile.status);
    }

    var query = {
        members: {
            $elemMatch: { profile: { $eq: profile.id }, isModerator: true }
        }
    };

    db.community.find(query).select('members.profile members.status')
        .populate({ path: 'members.profile', select: 'name picData picUrl about defaultCommunity' })
        .then(function(communities) {

            return communities;
        })
        .then(function(communities) {
            if (_.isEmpty(communities)) {
                return communities;
            }
            var profileIds = [];
            _.each(communities, function(community) {
                profileIds.push(_.filter(community.members, function(member) {
                    return member.profile && member.status === 'waiting';
                }));
            });
            return _.pluck(_.flatten(profileIds), 'profile');

        }).then(function(profileModels) {

            res.page(mapper.discoverPublicProfiles(profileModels));
        }).catch(function(err) {
            res.failure(err);
        });

};

exports.notify = function(req, res) {
    db.profile.findOne({
        _id: req.params.id
    }, function(err, profile) {
        if (err) {
            return res.failure(err);
        }
        if (!profile) {
            return res.failure('no profile found');
        }

        notificationService.notify(profile, {
            entity: {
                id: req.profile.id,
                type: 'profile'
            },
            api: 'profiles',
            action: 'notify',

            message: req.body.message,
            subject: req.body.subject
        }, function(err) {
            if (err) {
                return res.failure(err);
            }
            return res.success();
        });
    });
};


exports.createRecipient = function(req, res) {

    async.waterfall([
            function(cb) {
                var user = {
                    status: "new"
                };
                new db.user(user)
                    .save(function(err, user) {
                        if (err) {
                            return cb(err);
                        } else {
                            return cb(null, user);
                        }
                    });
            },
            function(user, cb) {
                var model = req.body;
                var profile = {
                    user: user,
                    status: "inComplete",
                    name: model.name,
                    gender: model.gender,
                    picUrl: model.picUrl,
                    picData: model.picData,
                    diseases: model.diseaseIds,
                    age: model.age,
                    loops: {
                        status: "active",
                        role: "admin",
                        profile: req.profile
                    }
                };
                new db.profile(profile)
                    .save(function(err, recipientProfile) {
                        if (err) {
                            return cb(err);
                        } else {
                            return cb(null, user, recipientProfile);
                        }
                    });
            },
            function(user, recipientProfile, cb) {
                db.user.findOneAndUpdate({
                    _id: user.id
                }, {
                    profile: recipientProfile
                }, function(err) {
                    if (err) {
                        return cb(err);
                    } else {
                        return cb(null, recipientProfile);
                    }
                });
            },
            function(recipientProfile, cb) {
                db.profile.findOneAndUpdate({
                        _id: req.profile
                    }, {
                        $addToSet: {
                            recipients: recipientProfile
                        }
                    },
                    function(err) {
                        if (err) {
                            return cb(err);
                        } else {
                            return cb(null, recipientProfile);
                        }
                    });
            },
            function(recipientProfile, cb) {
                db.profile.findOne({
                        _id: recipientProfile.id
                    })
                    .populate('diseases loops.profile')
                    .exec(function(err, recipientProfile) {
                        if (err) {
                            return cb(err);
                        } else {
                            return cb(null, recipientProfile);
                        }
                    });
            }
        ],
        function(err, recipientProfile) {
            if (err) {
                return res.failure();
            } else {
                return res.data(mapper.toModel(recipientProfile));
            }
        });

};

exports.myRecipients = function(req, res) {
    var query = {};
    query._id = req.profile.id;
    var myRecipients = [];

    myRecipients = req.profile.recipients;

    db.profile.find({
            _id: {
                $in: myRecipients
            }
        }).populate('diseases loops.profile')
        .exec(function(err, myRecipientsProfile) {
            if (err) {
                return res.failure();
            } else {
                return res.page(mapper.toSearchModel(myRecipientsProfile, query._id));
            }
        });
};

exports.getRecipient = function(req, res) {
    var query = {};
    var myRecipients = [];

    query._id = req.params.id;
    var isPresent;
    db.profile.findOne(query)
        .populate('diseases loops.profile')
        .exec(function(err, recipientModel) {
            if (err) {
                res.failure(err);
            }
            res.data(mapper.toModel(recipientModel));
        });
};

exports.updateRecipient = function(req, res) {

    var model = req.body;
    var query = {};
    query._id = req.params.id;
    async.waterfall([
            function(cb) {
                db.profile.findOne(query, function(err, recipientModel) {
                    if (err) {
                        return cb(err);
                    } else {
                        return cb(null, recipientModel);
                    }
                });
            },
            function(recipientModel, cb) {

                recipientModel = entitiesHelper(recipientModel).set(model, ['name', 'age', 'gender', 'picUrl', 'picData', 'providers']);
                recipientModel.diseases = model.diseaseIds;
                return cb(null, recipientModel);
            },
            function(recipientModel, cb) {
                if (model.loops) {
                    async.eachSeries(model.loops, function(loopItem, next) {

                        getProfile(loopItem.profileId, function(err, profileModel) {

                            if (err) {
                                return cb(err);
                            } else {
                                var recipients = profileModel.recipients;
                                var profileRecipient = _.find(recipients, function(item) {
                                    return item.toString() === recipientModel.id.toString();
                                });
                                var recipientProfile = _.find(recipientModel.loops, function(item) {
                                    return item.profile.toString() === loopItem.profileId;
                                });

                                if (!recipientProfile && !profileRecipient) {

                                    var recipientLoop = {
                                        status: "inactive",
                                        role: loopItem.role,
                                        profile: loopItem.profileId
                                    };
                                    recipientModel.loops.push(recipientLoop);


                                    var profileRequest = {
                                        status: "invited",
                                        role: loopItem.role,
                                        recipient: recipientModel.id
                                    };
                                    profileModel.incommingRecipientRequests.push(profileRequest);

                                    notify(profileModel, recipientModel, req.profile, true, "invited", function(err) {
                                        if (err) {
                                            return cb(err);
                                        } else {
                                            profileModel.save(function(err) {
                                                if (err) {
                                                    return cb(err);
                                                }
                                                next(null);
                                            });
                                        }
                                    });
                                } else {
                                    next(null);
                                }
                            }
                        });

                    }, function(err) {
                        if (err) {
                            return cb(err);
                        }
                        console.log(recipientModel);
                        cb(err, recipientModel);
                    });
                } else {
                    return cb(null, recipientModel);
                }
            },
            function(recipientModel, cb) {
                recipientModel.save(function(err) {
                    if (err) {
                        return cb(err);
                    }
                    return cb(null);
                });
            },
            function(cb) {
                db.profile.findOne(query)
                    .populate('diseases loops.profile')
                    .exec(function(err, model) {
                        if (err) {
                            return cb(err);
                        }
                        return cb(null, model);
                    });
            }

        ],
        function(err, model) {
            if (err) {
                return res.failure();
            }
            res.data(mapper.toModel(model));
            var activeProfiles = _.filter(model.loops, function(item) {
                if (item.status === "active" && item.profile.id !== req.profile.id) {
                    return item;
                }
            });
            var data = {
                api: 'profile/recipient',
                action: 'updation',
                modelIncluded: false
            };
            var type = 'recipient';
            async.each(activeProfiles, function(item, callback) {
                var block = {
                    id: item.profile.id
                };
                notifyUpdation.updation(block, data, type, model.id, function(err) {
                    if (err) {
                        return callback(err);
                    }
                });
            });
        });

};

exports.independentRecipient = function(req, res) {
    var model = req.body;
    var user;
    var query = {};
    query._id = req.params.id ? req.params.id : req.profile.id;
    async.waterfall([
        function(cb) {
            db.profile.findOneAndUpdate(query, {
                    status: "active"
                })
                .populate('user diseases')
                .exec(function(err, recipient) {
                    if (err) {
                        return cb(err);
                    }

                    cb(null, recipient);
                });
        },
        function(recipient, cb) {
            chatClient.createUser(model.phone, function(err, chatUser) {
                if (err) {
                    return cb(err);
                } else {
                    recipient.user.chat = {
                        id: chatUser.id,
                        password: chatUser.password
                    };
                    return cb(null, recipient);
                }
            });
        },
        function(recipient, cb) {
            recipient.user.phone = model.phone;
            recipient.user.status = "active";
            if (model.device) {
                recipient.user.device.id = model.device.id;
            }
            recipient.user.save(function(err) {
                if (err) {
                    return cb(err);
                }
                return cb(null, recipient);
            });
        }
    ], function(err, recipient) {
        if (err) {
            return res.failure(err);
        }
        return res.data(mapper.toModel(recipient));
    });
};

exports.acceptRecipientInvitation = function(req, res) {

    var myProfile = req.profile;
    var query = {};
    query._id = req.params.id;

    async.waterfall([
            function(cb) {

                getProfile(req.params.id, cb);
            },
            function(sharedRecipient, cb) {
                var recipientAdmin = _.find(sharedRecipient.loops, function(item) {
                    return item.role === "admin";
                });
                getProfile(recipientAdmin.profile, function(err, recipientAdmin) {
                    if (err) {
                        return cb(err);
                    }
                    cb(null, sharedRecipient, recipientAdmin);
                });
            },
            function(sharedRecipient, recipientAdmin, cb) {
                async.eachSeries(myProfile.incommingRecipientRequests, function(item, next) {
                        if (item.recipient.toString() === query._id) {

                            var index = myProfile.incommingRecipientRequests.indexOf(item);
                            myProfile.incommingRecipientRequests.splice(index, 1);
                            myProfile.recipients.push(query._id);
                            myProfile.save(function(err, myprofile) {
                                if (err) {
                                    return cb(err);
                                }
                                notify(recipientAdmin, sharedRecipient, myprofile, true, "accept", function(err) {
                                    if (err) {
                                        return cb(err);
                                    }
                                    return cb(null, myprofile);
                                });

                            });
                        } else {
                            next(null);
                        }
                    },
                    function(err, myprofile) {
                        if (err) {
                            return cb(err);
                        } else {
                            cb(null, myprofile);
                        }
                    });
            },
            function(myprofile, cb) {
                db.profile.findOne(query, function(err, recipientModel) {
                    if (err) {
                        return cb(err);
                    } else {
                        cb(null, myprofile, recipientModel);
                    }
                });
            },
            function(myprofile, recipientModel, cb) {
                _.each(recipientModel.loops, function(item) {
                    if (item.profile.toString() === req.profile.id) {
                        item.status = "active";
                        recipientModel.save(function(err) {
                            if (err) {
                                return cb(err);
                            }
                            cb(null);
                        });
                    }
                });
            },
            function(cb) {
                db.profile.findOne({
                        _id: req.profile.id
                    })
                    .populate('recipients tags interests')
                    .exec(function(err, myprofile) {
                        if (err) {
                            return cb(err);
                        } else {
                            cb(null, myprofile);
                        }
                    });
            }
        ],
        function(err, myprofile) {
            if (err) {
                return res.failure(err);
            } else {
                res.data(mapper.toModel(myprofile));
            }
        });
};

exports.rejectRecipientInvitation = function(req, res) {

    var myProfile = req.profile;
    var query = {};
    query._id = req.params.id;
    async.waterfall([
        function(cb) {

            _.each(myProfile.incommingRecipientRequests, function(item) {
                if (item._doc.recipient.toString() === query._id) {
                    var index = myProfile.incommingRecipientRequests.indexOf(item);
                    myProfile.incommingRecipientRequests.splice(index, 1);
                    myProfile.save(function(err, myProfile) {
                        if (err) {
                            return cb(err);
                        }
                        cb(null);
                    });
                }
            });
        },
        function(cb) {
            db.profile.findOne(query,
                function(err, recipientProfile) {
                    if (err) {
                        return cb(err);
                    } else {
                        _.each(recipientProfile.loops, function(item) {
                            if (item._doc.profile.toString() === req.profile.id) {
                                var index = recipientProfile.loops.indexOf(item);
                                recipientProfile.loops.splice(index, 1);
                                recipientProfile.save(function(err) {
                                    if (err) {
                                        return cb(err);
                                    }
                                    cb(null);
                                });
                            }
                        });
                    }
                });
        },
        function(cb) {
            db.profile.findOne({
                    _id: req.profile.id
                })
                .populate('recipients tags interests')
                .exec(function(err, myprofile) {
                    if (err) {
                        return cb(err);
                    } else {
                        cb(null, myprofile);
                    }
                });
        }
    ], function(err, myProfile) {
        if (err) {
            return res.failure(err);
        }
        res.data(mapper.toModel(myProfile));
    });

};
exports.acceptRequest = function(req, res) { //not using
    var model = req.body;
    var profile = req.profile;
    if (!profile.employeeNo) {
        return res.failure('Access Denied');
    }

    async.waterfall([function(cb) {
            db.profile.findOne({
                rollNo: model.rollNo
            }).exec(function(err, identity) {
                if (identity) {
                    return res.failure('Roll No Already Exits');
                }
                cb(null);
            });
        },
        function(cb) {
            db.profile.findOne({
                    _id: model.id
                }).populate('defaultCommunity')
                .exec(function(err, profile) {
                    if (err) {
                        return cb(err);
                    }
                    cb(null, profile);
                });
        },
        function(profile, cb) {
            db.community.update({
                    _id: profile.defaultCommunity,
                    "members.profile": model.id
                }, {
                    $set: {

                        "members.$.status": 'active'
                    }
                },
                function(err, community) {
                    if (err) {
                        return cb(err);
                    }
                    cb(null, profile);
                });
        },

        function(profile, cb) {
            profile.isWaiting = false;
            profile.rollNo = model.rollNo;
            profile.save();
            cb(null, profile);

        }
    ], function(err, profile) {
        if (err) {
            return res.failure(err);
        }
        notificationService.notify(profile, {
            entity: {
                id: req.profile.id,
                type: 'profile'
            },
            api: '/admin/accept',
            action: 'acceptRequest',

            message: req.body.message,
            subject: req.body.subject
        }, function(err) {
            if (err) {
                return res.failure(err);
            }
            return res.success();
        });
        // res.data(mapper.toModel(user));
    });
};
exports.rejectRequest = function(req, res) { //not using
    var model = req.body;
    var profile = req.profile;
    if (!profile.employeeNo) {
        return res.failure('Access Denied');
    }
    async.waterfall([
        function(cb) {
            db.profile.findOne({
                    _id: model.id
                }).populate('defaultCommunity')
                .exec(function(err, user) {
                    if (err) {
                        return cb(err);
                    }
                    cb(null, user);
                });
        },
        function(user, cb) {
            db.community.update({
                    _id: user.defaultCommunity.id,
                    "members.profile": model.id
                }, {
                    $set: {
                        "members.$.status": 'waiting'
                    }
                },
                function(err, community) {
                    if (err) {
                        return cb(err);
                    }
                    cb(null, user);
                });
        },

        function(user, cb) {
            user.isWaiting = true;
            user.rollNo = model.rollNo;
            user.save();
            cb(null, user);
        }
    ], function(err, user) {
        if (err) {
            return res.failure(err);
        }
        notificationService.notify(profile, {
            entity: {
                id: req.profile.id,
                type: 'profile'
            },
            api: '/admin/reject',
            action: 'rejectRequest',
            message: req.body.message,
            subject: req.body.subject
        }, function(err) {
            if (err) {
                return res.failure(err);
            }
            return res.success();
        });
        // res.data(mapper.toModel(user));
    });
};
exports.setMonitor = function(req, res) { //not using...
    var model = req.body;
    var profile = req.profile;
    if (!profile.employeeNo) {
        return res.failure('Access Denied');
    }
    async.waterfall([
        function(cb) {
            db.profile.findOne({
                    _id: model.id
                }).populate('defaultCommunity')
                .exec(function(err, user) {
                    if (err) {
                        return cb(err);
                    }
                    cb(null, user);
                });
        },
        function(user, cb) {
            db.community.update({
                    _id: user.defaultCommunity.id,
                    "members.profile": model.id
                }, {
                    $set: {
                        "members.$.status": 'active',
                        "members.$.isModerator": 'true'
                    }
                },
                function(err, community) {
                    if (err) {
                        return cb(err);
                    }
                    cb(null, user);
                });
        },

        function(user, cb) {
            user.isWaiting = true;
            user.rollNo = model.rollNo;
            user.save();
            cb(null, user);
        }
    ], function(err, user) {
        if (err) {
            return res.failure(err);
        }
        notificationService.notify(profile, {
            entity: {
                id: req.profile.id,
                type: 'profile'
            },
            api: '/admin/setmonitor',
            action: 'setMonitor',
            message: req.body.message,
            subject: req.body.subject
        }, function(err) {
            if (err) {
                return res.failure(err);
            }
            return res.success();
        });
        // res.data(mapper.toModel(user));
    });
};

exports.againRequest = function(req, res) { //for again request to come in waiting

    var profile = req.profile,
        communityId = req.params.communityId === "defaultCommunity" ? req.profile.defaultCommunity : req.params.communityId;

    async.parallel([
            function(cb) {
                profile.status = 'waiting';
                profile.save(cb);
            },
            function(cb) {
                dbQuery.updateCommunity({
                    profileId: profile.id,
                    communityId: communityId,
                    set: {
                        $set: {
                            'members.$.status': 'waiting'
                        }
                    }
                }, function(err) {
                    if (err) {
                        return cb(err);
                    }
                    cb(null);
                });
            }
        ],
        function(err) {
            if (err) {
                return res.failure(err);
            }
            res.success("status change to waiting");
        });
};