"use strict";
var auth = require('../middleware/authorization');
let db = require('mongoose').models;
let Client = require('node-rest-client').Client;
let async = require('async');
var mappers = require('../mappers');
let client = new Client();
var chatConfig = require('config').get('chat');
var chatClient = require('../providers/' + chatConfig.provider);
var sms = require('../helpers/smsHelper');


var manageCourse = function (extData, callback) {
    if (extData.CurrentRole.Type !== 'Student') {
        return callback(null, null);
    }
    async.waterfall([
        function (cb) {
            db.course.findOrCreate({ // for course
                name: extData.Roles[0].Batch.Course.Name,
                school: extData.school.id
            }, cb);
        },
        function (course, isCreated, cb) { //for batch

            var data = {
                isDefault: true,
                isPublic: false,
                subject: extData.Roles[0].Batch.Year,
                school: extData.school.id,
                body: course.name
            };
            db.community.findOrCreate(data, function (err, community, created) {
                if (err) {
                    return cb(err);
                }
                community.isCreated = created;
                community.course = course;
                cb(null, community);
            });
        },
        function (community, cb) {
            if (!community.isCreated) {
                return cb(null, community);
            }

            community.course.batches.push({
                name: community.subject,
                status: "active",
                batch: community.id
            });

            community.course.save(function (err, course) {
                if (err) {
                    return cb(err);
                }
                cb(null, community);
            });
        }
    ], function (err, batch) {
        if (err) {
            return callback(err);
        }
        callback(null, batch);
    });
};

var manageBatch = function (extData, callback) {
    async.waterfall([
        function (cb) { //for batch
            var data = {
                isDefault: true,
                isPublic: false,
                subject: extData.Section.Batch.Year,
                school: extData.school,
                body: extData.Section.Batch.Course.Name
            };
            db.community.findOrCreate(data, function (err, community, created) {
                if (err) {
                    return cb(err);
                }
                community.isCreated = created;
                community.course = extData.course;
                cb(null, community);
            });
        },
        function (community, cb) {
            if (!community.isCreated) {
                return cb(null, community);
            }

            community.course.batches.push({
                name: community.subject,
                status: "active",
                batch: community.id
            });

            community.course.save(function (err, course) {
                if (err) {
                    return cb(err);
                }
                cb(null, community);
            });
        }
    ], function (err, batch) {
        if (err) {
            return callback(err);
        }
        callback(null, batch);
    });
};


exports.create = function (req, res) {
    var url;

    let course, schoolDetails = {};

    if (!req.headers['external-token']) {
        return res.failure('external-token is required');
    }

    if (!req.headers['org-code']) {
        return res.failure('org-code is required');
    }

    let args = {
        headers: {
            "Content-Type": "application/json",
            "orgCode": req.headers["org-code"],
            "x-api-token": req.headers["external-token"]
        }
    };

    async.waterfall([
            function (cb) {
                client.get(url, args, function (extData, response) {
                    if (!extData) {
                        return cb(extData.error || extData.message);
                    }
                    cb(null, extData);
                });
            },
            function (extData, cb) { //if school not exit
                db.school.findOrCreate({
                        code: extData.CurrentRole.Organization.Code + '-' + extData.CurrentRole.Division.Code,
                        name: extData.CurrentRole.Division.Name,
                        orgCode: extData.CurrentRole.Organization.Code
                    },
                    function (err, school, isCreated) {
                        if (err) {
                            return cb(err);
                        }
                        if (extData.Roles[0].Batch) {
                            course = extData.Roles[0].Batch.Course.Name;
                        }
                        extData.school = school;
                        schoolDetails = school;
                        cb(null, extData);
                    });
            },
            function (extData, cb) {

                if (!extData.Mobile) {
                    return cb('mobile is required');
                }

                db.user.findOne({
                        phone: extData.Mobile,
                        status: "active"
                    }).populate('profile')
                    .exec(function (err, user) {
                        if (err) {
                            return cb(err);
                        }
                        cb(null, extData, user);
                    });
            },
            function (extData, user, cb) {
                manageCourse(extData, function (err, batch) {
                    if (err) {
                        return cb(err);
                    }
                    cb(null, extData, batch, user);
                });
            },
            function (extData, batch, user, cb) {
                if (user) {
                    user.save(function () {
                        let mapperUser = mappers.user.toLoginModel(user);
                        mapperUser.schoolCode = extData.school.code;
                        mapperUser.schoolName = extData.school.name;
                        mapperUser.orgLogo = extData.school.logo;
                        if (extData.Roles[0].Batch) {
                            mapperUser.profile.course = course;
                        }
                        return res.data(mapperUser);
                    });
                } else {
                    cb(null, extData, batch);
                }
            },
            function (extData, batch, cb) {
                chatClient.createUser({ id: extData.Mobile, name: extData.Name },
                    function (err, chatUser) {
                        if (err) {
                            return cb(err);
                        }
                        cb(null, extData, batch, chatUser);
                    });
            },
            function (extData, batch, chatUser, cb) {
                new db.user({
                        phone: extData.Mobile,
                        status: "active",
                        pin: null,
                        chat: {
                            id: chatUser.id,
                            password: chatUser.password
                        }
                    })
                    .save(function (err, user) {
                        if (err) {
                            return cb(err);
                        }
                        cb(null, extData, batch, user);
                    });
            },
            function (extData, batch, user, cb) {

                new db.profile({
                        name: extData.Name,
                        user: user.id,
                        type: extData.CurrentRole.Type.toLowerCase(),
                        code: extData.CurrentRole.Code,
                        defaultCommunity: batch ? batch.id : null, // for employee batch is null
                        rollNo: extData.CurrentRole.Code,
                        status: 'active',
                        gender: extData.Gender,
                        dateOfBirth: extData.DOB,
                        picUrl: extData.ImageButtonUrl,
                        school: {
                            id: extData.school.id,
                            code: extData.school.code
                        }
                    })
                    .save(function (err, profile) {
                        if (err) {
                            return cb(err);
                        }
                        user.profile = profile;
                        user.token = auth.getToken(user);
                        user.save(function (err, user) {
                            if (err) {
                                return cb(err);
                            }
                            cb(null, extData, user, batch);
                        });
                    });
            },
            function (extData, user, batch, cb) {
                if (!batch) { //means teacher
                    return cb(null, extData, user, batch);
                }
                batch.members.push({
                    status: "active",
                    profile: user.profile,
                    deactivated: false,
                    muted: false,
                    isModerator: false
                });
                batch.save(function (err) {
                    if (err) {
                        return cb(err);
                    }
                    cb(null, extData, user, batch);
                });
            },
            function (extData, user, batch, cb) {
                if (batch) { //means student
                    return cb(null, user);
                }
                db.community.findOrCreate({
                    isDefault: true,
                    isPublic: false,
                    school: extData.school,
                    subject: 'Staff Room'
                }, {
                    isDefault: true,
                    isPublic: false,
                    school: extData.school,
                    subject: 'Staff Room'
                }, function (err, community, isCreated) {
                    community.members.push({
                        profile: user.profile,
                        status: "active",
                        deactivated: false,
                        muted: false,
                        isModerator: false
                    });

                    user.profile.defaultCommunity = community;

                    async.parallel([
                        function (cb) {
                            user.profile.save(function (err) {
                                if (err) {
                                    return cb(err);
                                }
                                cb(null, user);
                            });
                        },
                        function (cb) {
                            community.save(function (err) {
                                if (err) {
                                    return cb(err);
                                }
                                cb(null);
                            });
                        }
                    ], function (err, result) {
                        cb(null, result[0]);
                    });
                });
            }
        ],
        function (err, user) {
            if (err) {
                return res.failure(err);
            }
            let mapperUser = mappers.user.toLoginModel(user);
            mapperUser.schoolCode = user.profile.school.code;
            mapperUser.schoolName = schoolDetails.name;
            mapperUser.orgLogo = schoolDetails.logo;
            if (course) {
                mapperUser.profile.course = course;
            }
            res.data(mapperUser);
        });
};
