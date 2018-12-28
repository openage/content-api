'use strict';
var async = require('async');
var _ = require('underscore');
var db = require('mongoose').models;
var mapper = require('../mappers/participant');

var notificationService = require('../services/notification');

var notify = function(activity, profile, participantStatus, hasChanged, requstingProfile, cb) {
    if (hasChanged) {
        notificationService.notify(profile, {
            entity: {
                id: activity.id,
                type: 'activity',
                data: activity,
                picUrl: activity.picUrl,
                requstingPerson: requstingProfile
            },
            api: 'participants',
            action: participantStatus
        }, function(err) {
            cb(null);
        });
    } else {
        cb(null);
    }
};
exports.notify = notify;

var notifyToAllAdmins = function(activity, status, requestedProfile, cb) {

    var admins = _(activity.participants).filter(function(item) {
        return item.status === "admin";
    });

    async.each(admins, function(admin) {
        async.waterfall([
            function(cb) {
                db.profile.findOne({ _id: admin.profile.toString() }, cb);
            },
            function(adminProfile, cb) {
                notify(activity, adminProfile, status, true, requestedProfile, function(err) {
                    cb(err);
                });
            }
        ], cb);
    }, function(err) {
        cb(err);
    });
};

var getProfileAndActivity = function(profileId, activityId, cb) {
    async.waterfall([
        function(cb) {
            db.profile.findOne({
                _id: profileId
            }, 'activities', function(err, profile) {
                if (err) {
                    return cb(err);
                } else {

                    return cb(null, profile);
                }
            });
        },
        function(profile, cb) {
            db.activity.findOne({
                _id: activityId
            }, function(err, activity) {
                if (err) {
                    return cb(err);
                } else {
                    return cb(null, profile, activity);
                }
            });
        }
    ], function(err, profile, activity) {
        if (err) {
            return cb(err);
        } else {
            return cb(null, profile, activity);
        }
    });
};

var updateLatest = function(profile, activity, message, cb) {

    db.activity.findOneAndUpdate({ _id: activity.id }, {

            lastUpdate: {
                profile: profile,
                content: profile.name + message
            }
        })
        .populate('participants.profile')
        .exec(function(err, activity) {
            if (err) {
                return cb(err);
            }
            cb(null, activity);
        });
};

exports.updateLatest = updateLatest;


// POST null = join
// POST profile = invite
// POST activities/{activityId}/participants
exports.create = function(req, res) {
    var profileIds = [];
    if (req.body.profileIds) {
        profileIds = req.body.profileIds;
    } else {
        profileIds.push(req.profile.id);
        var forSingle = true;
    }

    async.waterfall([
            function(cb) {
                db.activity.findOne({
                    _id: req.params.activityId
                }, cb);
            },
            function(activity, cb) {
                if (!activity) {
                    return cb('activity does not exist');
                }
                if (forSingle) {
                    updateLatest(req.profile, activity, " has join Activity.", function(err, activity) {
                        if (err) {
                            return cb(err);
                        }
                        cb(null, activity);
                    });

                } else {
                    cb(null, activity);
                }
            },
            function(activity, cb) {

                var profiles = [];

                async.each(profileIds, function(profileId, cb) {

                    db.profile.findOne({
                        _id: profileId
                    }).exec(function(err, profile) {
                        if (err) {
                            return cb(err);
                        }
                        profiles.push(profile);
                        cb(null);
                    });

                }, function(err) {
                    cb(err, activity, profiles);
                });
            },
            function(activity, profiles, cb) {

                var newParticipants = [];

                async.eachSeries(profiles, function(profile, cb) {

                    var participantActivity = _(profile.activities).find(function(item) {
                        return item.activity.toString() === activity.id;
                    });
                    var activityParticipant = _(activity.participants).find(function(item) {
                        return item.profile.toString() === profile.id;
                    });


                    var status = '';

                    if (participantActivity) {
                        status = participantActivity.status;
                    }


                    if (activityParticipant) {
                        if (activityParticipant.status === 'invited') {
                            return cb(null);
                        }
                    }

                    if (participantActivity) {
                        if (participantActivity.status === 'invited') {
                            return cb(null);
                        }
                    }

                    if (status !== 'blocked') {
                        if (profile.id === req.profile.id) {
                            status = 'active';
                        } else {
                            status = 'invited';
                        }
                    } else {
                        return cb(null);
                    }

                    if (!participantActivity) {
                        participantActivity = {
                            status: status,
                            activity: activity,
                            date: new Date()
                        };
                        profile.activities.push(participantActivity);

                    }
                    if (!activityParticipant) {
                        activityParticipant = {
                            status: status,
                            profile: profile.id,
                            date: new Date()
                        };
                        activity.participants.push(activityParticipant);
                    }


                    profile.save(function(err) {
                        if (err) {
                            cb(err);
                        } else {
                            newParticipants.push(activityParticipant);
                            if (profile.id !== req.profile.id) {
                                notify(activity, profile, status, true, req.profile, cb);
                            } else {
                                notifyToAllAdmins(activity, status, req.profile, cb);
                            }
                        }
                    });

                }, function(err) {
                    activity.save(function(err) {
                        cb(err, newParticipants);
                    });
                });
            }
        ],
        function(err, newParticipants) {
            if (err) {
                res.failure(err);
            } else {
                if (forSingle) {
                    res.data(mapper.toModel(newParticipants[0]));
                } else {
                    res.data(mapper.toSearchModel(newParticipants));
                }
            }
        });
};

// DELETE // POST activities/{activityId}/participants/me
exports.delete = function(req, res) {
    var profileId = req.params.id === 'me' ? req.profile.id : req.params.id;
    async.waterfall([
        function(cb) {
            getProfileAndActivity(profileId, req.params.activityId, cb);
        },
        function(profile, activity, cb) {

            var index, activityParticipant, hasChanged = false;
            for (index in profile.activities) {
                if (profile.activities[index].activity.id === activity.id) {
                    profile.activities.splice(index, 1);
                    hasChanged = true;
                    break;
                }
            }

            for (index in activity.participants) {
                if (activity.participants[index].profile.id === profile.id) {
                    activityParticipant = activity.participants.splice(index, 1);
                    hasChanged = true;
                    break;
                }
            }

            if (hasChanged) {
                async.parallel([
                    function(cb) {
                        profile.save(cb);
                    },
                    function(cb) {
                        activity.save(cb);
                    }
                ], function(err) {
                    cb(err, profile, activity, hasChanged);
                });
            } else {
                cb(null, profile, activity, hasChanged);
            }
        },
        function(profile, activity, hasChanged, cb) {
            notify(activity, profile, 'deleted');
        }
    ], function(err) {
        if (err) {
            res.failure(err);
        } else {
            res.success();
        }
    });
};

// only status update supported - active, blocked, muted
// PUT activities/{activityId}/participants/{profileId}
exports.update = function(req, res) {
    var model = req.body;
    var profileId = req.params.id === 'me' ? req.profile.id : req.params.id;
    async.waterfall([
        function(cb) {
            getProfileAndActivity(profileId, req.params.activityId, cb);
        },
        function(profile, activity, cb) {
            var participantActivity = _(profile.activities).find(function(item) {
                return item.activity.toString() === activity.id.toString();
            });
            var participant = _(activity.participants).find(function(item) {
                return item.profile.toString() === profile.id.toString();
            });

            if (participantActivity) {
                participantActivity.status = model.status;
            }
            if (participant) {
                participant.status = model.status;
            }
            async.parallel([
                function(cb) {
                    profile.save(cb);
                },
                function(cb) {
                    activity.save(cb);
                }
            ], function(err) {
                cb(null, activity, participant);
            });
        },
        function(activity, participant, cb) {
            if (model.status === "active") {
                updateLatest(req.user.profile, activity, " has join Activity.", function(err, activity) {
                    if (err) {
                        return cb(err);
                    }
                    cb(null, participant, activity);
                });
            } else {
                cb(null, participant, activity);
            }
        },
        function(participant, activity, cb) {
            if (participant) {
                notifyToAllAdmins(activity, participant.status, req.profile, function(err) {
                    if (err) {
                        cb(err);
                    } else {
                        cb(null, participant);
                    }
                });
            }
        }
    ], function(err, participant) {
        if (err) {
            res.failure(err);
        } else {
            res.data(mapper.toModel(participant));
        }
    });
};

exports.search = function(req, res) {
    db.activity.findOne({
            _id: req.params.activityId
        })
        .populate('participants.profile')
        .exec(function(err, activity) {
            res.log.silly(activity.participants);
            if (err) {
                return res.failure(err);
            }

            var participants = _(activity.participants).filter(function(item) {
                return item.status !== 'deleted';
            });
            res.page(mapper.toSearchModel(participants));
        });
};