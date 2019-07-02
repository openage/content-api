"use strict";
var async = require('async');
var db = require('mongoose').models;
var auth = require('../middleware/authorization');
var mappers = require('../mappers');
var entitiesHelper = require('../helpers/entities');

var logger = require('@open-age/logger')('api.users');

var chatConfig = require('config').get('chat');
var chatClient = require('../providers/' + chatConfig.provider);

var smsConfig = require('config').get('sms');
var smsClient = require('../providers/' + smsConfig.provider);
var sms = require('../helpers/smsHelper');

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

    if (profile.type === 'employee') {
        db.community.findOrCreate({
            isDefault: true,
            isPublic: false,
            school: query.school,
            subject: 'Staff Room'
        }, {
                isDefault: true,
                isPublic: false,
                school: query.school,
                subject: 'Staff Room'
            }, function (err, community, isCreated) {
                community.members.push({
                    profile: profile.id,
                    status: 'waiting',
                    deactivated: false,
                    muted: false,
                    isModerator: false
                });
                profile.defaultCommunity = community;
                callback(null, profile);
            });
    } else {
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
    }

    // if (model.batch) {
    //     db.community.findOne({
    //         _id: model.batch.id
    //     }).exec(function(err, community) {
    //         if (err) {
    //             return callback(err);
    //         }
    //         community.members.push({
    //             isModerator: false,
    //             status: 'waiting',
    //             profile: profile.id,
    //             date: new Date()
    //         });
    //         community.save(function(err, community) {
    //             if (err) {
    //                 return callback(err);
    //             }
    //             profile.defaultCommunity = community.id;
    //             profile.batchNo = model.batchNo;
    //             callback(null, profile);
    //         });
    //     });

    // } else {
    //     db.community.findOne({
    //         subject: "Staff Room"
    //     }).exec(function(err, community) {
    //         if (err) {
    //             return callback(err);
    //         }
    //         community.members.push({
    //             isModerator: false,
    //             status: 'waiting',
    //             profile: profile.id,
    //             date: new Date()
    //         });
    //         community.save(function(err, community) {
    //             if (err) {
    //                 return callback(err);
    //             }
    //             profile.defaultCommunity = community.id;
    //             profile.emplyeeNo = model.employeeNo;
    //             callback(null, profile);
    //         });
    //     });
    // }

};


var createUser = function (data, school, callback) {
    async.waterfall([
        function (cb) {
            chatClient.createUser({ id: data.phone || data.facebookId, name: data.name }, cb);
        },
        function (chatUser, cb) {
            var user = {
                phone: data.phone,
                facebookId: data.facebookId,
                password: data.password,
                status: 'new',
                pin: auth.newPin(),
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
                status: 'inComplete',
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

                    //data.defaultCommunity from request

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

// var buildUser = function (data, school, callback) {
//     async.waterfall([
//         function (cb) {
//             chatClient.createUser({ id: data.phone || data.facebookId, name: data.name }, cb);
//         },
//         function (chatUser, cb) {
//             var user = {
//                 phone: data.phone,
//                 status: 'new',
//                 chat: {
//                     id: chatUser.id,
//                     password: chatUser.password
//                 }
//             };

//             if (data.device) {
//                 user.device = {
//                     id: data.device.id
//                 };
//             }
//             (new db.user(user)).save(function (err, user) {
//                 if (err) {
//                     cb(err);
//                 } else {
//                     cb(null, user);
//                 }
//             });
//         },
//         function (user, cb) {
//             var profile = {
//                 name: data.name,
//                 user: user,
//                 status: 'inComplete',
//                 school: {
//                     code: school.code,
//                     id: school.id,
//                 },
//                 chat: {
//                     id: user.chat.id
//                 }
//             };
//             new db.profile(profile).save(function (err, profile) {
//                 if (err) {
//                     return cb(err);
//                 }
//                 user.profile = profile;
//                 pinMessage(user, cb);
//             });
//         }
//     ], function (err, item) {
//         if (err) {
//             return callback(err);
//         }
//         return callback(null, item);
//     });
// };

// var pinMessage = function (user, callback) {
//     var pin = auth.newPin();
//     user.pin = pin;
//     user.save(function (err, item) {
//         if (err) {
//             return callback(err);
//         }
//         sms.sendMessage(item.phone, item.pin);
//         callback(null, item);
//     });
// }


var signup = function (req, needsPin, callback) {
    var model = req.body;
    var log = logger.start('signup');
    async.waterfall([
        function (cb) {
            createUser(model, req.school, cb);
        },
        function (user, cb) {
            if (needsPin) {
                log.debug('user needs pin for activation');
                sms.sendMessage(user.phone, user.pin);
                cb(null, user);
            } else {
                user.status = 'active';
                user.pin = null;
                user.token = auth.getToken(user);
                user.save(cb);
            }
        }
    ], callback);
};
exports.signIn = function (req, res) {
    var model = req.body;
    var query = {};
    var schoolCode = req.headers['school-code'];
    if (model.username) {
        query.phone = model.username;
    }
    if (model.phone) {
        query.phone = model.phone;
    }
    if (model.facebookId) {
        query.facebookId = model.facebookId;
    }
    query.password = model.password;
    //TO DO set for tunneling password
    db.user.findOne(query)
        .populate({
            path: 'profile',
            populate: {
                path: 'defaultCommunity',
                select: 'body'
            }
        }).exec(function (err, user) {
            if (err) {
                return res.failure(err);
            }
            if (!user) {
                return res.failure("Invalid phone number or password");
            }
            if (user.profile.school.code !== schoolCode) {
                return res.failure("Invalid college");
            }
            if (model.type === 'admin') {
                if (user.profile.type !== 'admin') {
                    return res.failure('profile type is not admin');
                }
            }
            if (user.profile.type === 'student') {
                user.profile.course = user.profile.defaultCommunity.body;
            }
            user.profile.defaultCommunity = user.profile.defaultCommunity.id;
            res.data(mappers.user.toLoginModel(user));
        });
};

exports.create = function (req, res) {

    db.user.findOne({
        phone: req.body.phone
    }).exec(function (err, user) {
        if (err) {
            return res(err);
        }
        if (user) {
            return res.failure("Phone no already exist");
        }
        signup(req, true, function (err, user) {
            if (err) {
                return res.failure(err);
            }
            return res.data({
                id: user.id
            }, 'pin sent');
        });
    });


};

exports.get = function (req, res) {
    db.user.findOne({ _id: req.params.id }, function (err, user) {
        if (err) {
            return res.failure(err);
        }
        if (!user) {
            return res.failure('no user found');
        }
        return res.data(mappers.user.toModel(user));
    });
};

exports.delete = function (req, res) {
    async.waterfall([
        function (cb) {
            db.user.findOne({ _id: req.params.id }, cb);
        },
        function (user, cb) {
            chatClient.deleteUser(user.jabber.id, cb);
        },
        function (user, cb) {
            user.delete(cb); // todo - delete profile
        }
    ], function (err, user) {
        if (err) {
            return res.failure(err);
        }
        return res.success('user deleted');
    });
};

exports.update = function (req, res) {
    var data = req.body;
    async.waterfall([function (cb) {
        db.user.findOne({ _id: req.params.id }).exec(function (err, result) {
            if (err) {
                return cb(err);
            }
            cb(null, result);
        });
    },
    function (user, cb) {
        user = entitiesHelper(user).set(data, [
            'phone',
            'facebookId',
            'status',
            'device',
            'chat',
            'password'
        ]);
        user.save(function (err, user) {
            if (err) {
                return cb(err);
            }
            cb(null, user);
        });
    }
    ], function (err, user) {
        if (err) {
            return res(err);
        }
        res.data(mappers.user.toModel(user), 'updated');
    });

};

exports.validatePin = function (req, res) {
    var pin = req.body.pin;
    var schoolCode = req.school.code;
    async.waterfall([
        function (cb) {
            db.school.findOne({
                code: schoolCode
            }, function (err, school) {
                if (err) {
                    return cb(err);
                }
                if (!school) {
                    return cb('school not present');
                }
                cb(null, school);
            });
        },
        function (school, cb) {
            db.user.findById(req.params.id)
                .populate({
                    path: 'profile',
                    populate: {
                        path: 'defaultCommunity',
                        select: 'body'
                    }
                }).exec(function (err, user) {
                    if (err) {
                        return cb(err);
                    }

                    if (!user) {
                        res.log.info('user does not exist');
                        return cb('user does not exist');
                    }

                    user.school = school;
                    cb(err, user);
                });
        },
        function (user, cb) {
            if (user.pin === pin || pin === '9191') { //todo: use next line
                // if (user.pin === pin || (user.pin && pin === '9191')) { //hack: to bypass the pin
                return cb(null, user);
            }
            res.log.info('invalid pin');
            return cb('invalid pin');
        },
        function (user, cb) {
            async.parallel({
                user: function (cb) {
                    res.log.info('user activated');
                    user.status = 'active';
                    user.pin = null;
                    user.token = auth.getToken(user);
                    user.save(function (err, updatedUser) {
                        res.log.debug('user saved');
                        if (err) {
                            return cb(err);
                        }
                        cb(null, updatedUser);
                    });
                },
                profile: function (cb) {
                    if (user.profile.status === 'inComplete') {
                        user.profile.status = 'waiting';
                        // if (user.profile.type === 'admin') {

                        //     user.profile.status = 'admin'; //active will be discoverable
                        // }
                        user.profile.save(cb(null));
                    } else {
                        if (user.profile.type === 'student') {
                            user.profile.course = user.profile.defaultCommunity.body;
                        }
                        user.profile.defaultCommunity = user.profile.defaultCommunity.id;
                        cb(null);
                    }

                }
            }, function (err, models) {
                if (err) {
                    return cb(err);
                }
                cb(null, models.user);
            });
        }
    ],
        function (err, user) {
            if (err) {
                return res.failure(err);
            }
            res.data(mappers.user.toLoginModel(user));
        });
};

exports.signupFacebook = function (req, res) {
    signup(req.body, false, function (err, user) {
        if (err) {
            return res.failure(err);
        }
        return res.data(mappers.user.toLoginModel(user));
    });
};

exports.search = function (req, res) {
    db.user
        .find()
        .exec(function (err, users) {
            if (err) {
                return res.failure(err);
            }
            res.log.silly(users);
            return res.page(mappers.user.toModels(users));
        });
};

exports.getbyjabber = function (req, res) {

    var jabbarIds = req.body.jabbarIds;

    db.user.find({
        'chat.id': {
            $in: jabbarIds
        }
    })
        .populate('profile')
        .exec(function (err, users) {
            if (err) {
                return res.failure(err);
            } else {
                return res.page(mappers.user.toModels(users));
            }
        });
};

// exports.logIn = function (req, res) {
//     var model = req.body;
//     var needsPin = false;
//     var query = {};
//     var schoolCode = req.headers['school-code'];
//     if (!model.device || !model.device.id) {
//         return res.failure("device Id required");
//     }

//     // if (model.name) {
//     //     query.name = model.name;
//     // }

//     if (model.phone) {
//         query.phone = model.phone;
//     }

//     if (model.facebookId) {
//         query.facebookId = model.facebookId;
//     }
//     async.parallel({
//         clear: function (cb) {
//             var deviceQuery = {};

//             deviceQuery['device.id'] = model.device.id;

//             deviceQuery.phone = {
//                 $ne: model.phone
//             };

//             var set = {
//                 $set: {
//                     device: { id: null }
//                 }
//             };

//             db.user.update(deviceQuery, set, { multi: true },
//                 function (err, data) {
//                     return cb(err);
//                 });
//         },
//         user: function (cb) {
//             var set = {
//                 $set: {
//                     'device.id': model.device.id
//                 }
//             };
//             db.user
//                 .findOneAndUpdate(query, set, { new: true })
//                 .populate({
//                     path: 'profile',
//                     populate: {
//                         path: 'defaultCommunity',
//                         select: 'body'
//                     }
//                 }).exec(function (err, user) {
//                     if (err) {
//                         return cb(err);
//                     }
//                     if (!user) {
//                         needsPin = true;
//                         buildUser(model, req.school, cb);
//                         // return res.failure("invalid phone number or password");
//                     }
//                     if (user) {
//                         pinMessage(user, cb);
//                     }
//                 });
//         }
//     },
//         function (err, result) {
//             if (err) {
//                 return res.failure(err);
//             }
//             return res.data({ id: result.user.id }, 'pin sent');
//         });
// }

exports.deviceManger = function (req, res) {
    var deviceId = req.body.id;

    async.waterfall([
        function (cb) {
            db.user.update({
                device: {
                    id: deviceId
                }
            }, {
                    device: {
                        id: null
                    }
                }, function (err) {
                    if (err) {
                        return cb(err);
                    }
                    return cb(null);
                });
        },
        function (cb) {
            db.user.findById(req.params.userId)
                .exec(function (err, user) {
                    if (err) {
                        return cb(err);
                    }
                    if (!user) {
                        res.log.info('user does not exist');
                        return cb('user does not exist');
                    }
                    user.device.id = deviceId;
                    user.save(function () {
                        return cb(null);
                    });
                });
        }], function (err) {
            if (err) {
                return res.failure(err);
            }
            return res.success();
        })

}

