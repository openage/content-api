'use strict';
var async = require('async');
var notificationService = require('../services/notification');
var _ = require('underscore');
var db = require('mongoose').models;
var mapper = require('../mappers/member');

var notify = function(community, profile, membershipStatus, hasChanged, requstingProfile, cb) {
    if (hasChanged) {
        notificationService.notify(profile, {
            entity: {
                id: community.id,
                type: 'community',
                picData: community.picData,
                picUrl: community.picUrl,
                data: community,
                requstingPerson: requstingProfile
            },
            api: 'members',
            action: membershipStatus
        }, function(err) {
            cb(null);
        });
    } else {
        cb(null);
    }
};

var notifyToAllAdmins = function(community, status, requestedProfile, cb) {

    var admins = _(community.members).filter(function(item) {
        return item.status === "admin";
    });

    async.each(admins, function(admin) {
        async.waterfall([
            function(cb) {
                db.profile.findOne({ _id: admin.profile.toString() }, cb);
            },
            function(adminProfile, cb) {
                notify(community, adminProfile, status, true, requestedProfile, function(err) {
                    cb(err);
                });
            }
        ], cb);
    }, function(err) {
        cb(err);
    });
};

var getProfileAndCommunity = function(profileId, communityId, cb) {
    async.waterfall([
        function(cb) {
            db.profile.findOne({
                _id: profileId
            }, 'communities', function(err, profile) {
                if (err) {
                    return cb(err);
                } else {

                    return cb(null, profile);
                }
            });
        },
        function(profile, cb) {
            db.community.findOne({
                _id: communityId
            }, function(err, community) {
                if (err) {
                    return cb(err);
                } else {
                    return cb(null, profile, community);
                }
            });
        }
    ], function(err, profile, community) {
        if (err) {
            return cb(err);
        } else {
            return cb(null, profile, community);
        }
    });
};

// POST null = join
// POST profile = invite
// POST communities/{communityId}/members
exports.create = function(req, res) {
    var profileIds = []; // req.user.profile.id;

    if (req.body.profileIds) {
        profileIds = req.body.profileIds;
    } else {
        profileIds.push(req.profile.id);
        var forSingle = true;
    }

    async.waterfall([
            function(cb) {
                db.community.findOne({
                    _id: req.params.communityId
                }, cb);
            },
            function(community, cb) {
                if (!community) {
                    return cb('community does not exist');
                }

                var profiles = [];

                async.each(profileIds, function(profileId, cb) {

                    db.profile.findOne({
                            _id: profileId
                        })
                        .populate('user')
                        .exec(function(err, profile) {
                            if (err) {
                                return cb(err);
                            }
                            profiles.push(profile);
                            cb(null);
                        });

                }, function(err) {
                    cb(err, community, profiles);
                });
            },
            function(community, profiles, cb) {

                var newMembers = [];

                async.eachSeries(profiles, function(profile, cb) {

                    var memberCommunity = _(profile.communities).find(function(item) {
                        return item.community.toString() === community.id;
                    });
                    var communityMember = _(community.members).find(function(item) {
                        return item.profile.id === profile.id;
                    });

                    var status = '';

                    if (communityMember) {
                        if (communityMember.status === 'invited') {
                            return cb(null);
                        }
                    }

                    if (memberCommunity) {
                        if (memberCommunity.status === 'invited') {
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

                    if (!memberCommunity) {
                        memberCommunity = {
                            status: status,
                            community: community,
                            date: new Date()
                        };
                        profile.communities.push(memberCommunity);

                    }
                    if (!communityMember) {
                        communityMember = {
                            status: status,
                            profile: profile,
                            date: new Date()
                        };
                        community.members.push(communityMember);
                    }

                    profile.save(function(err) {
                        if (err) {
                            return cb(err);
                        }
                        newMembers.push(communityMember);
                        if (profile.id !== req.profile.id) {
                            notify(community, profile, status, true, req.profile, cb);
                        } else {
                            notifyToAllAdmins(community, status, req.profile, cb);
                        }
                    });
                }, function(err) {
                    community.save(function(err) {
                        cb(err, newMembers);
                    });
                });
            }
        ],
        function(err, newMembers) {
            if (err) {
                res.failure(err);
            } else {
                if (forSingle) {
                    res.data(mapper.toModel(newMembers[0]));
                } else {
                    res.page(mapper.toSearchModel(newMembers));
                }
            }
        });
};

// DELETE communities/{communityId}/members/{profileId}
exports.delete = function(req, res) {

    if (req.profile.defaultCommunity.toString() === req.params.communityId) {
        return res.failure('default community can not remove from your profile');
    }

    var profileId = req.params.id === 'me' ? req.profile.id : req.params.id;
    async.waterfall([
        function(cb) {
            getProfileAndCommunity(profileId, req.params.communityId, cb);
        },
        function(profile, community, cb) {

            // todo if profileId !== me 
            // check if user is admin of the  communities

            var index, communityMember, hasChanged = false;
            for (index in profile.communities) {
                if (profile.communities[index].community.toString() === community.id) {
                    profile.communities.splice(index, 1);
                    hasChanged = true;
                    break;
                }
            }

            for (index in community.members) {
                if (community.members[index].profile.toString() === profile.id) {
                    communityMember = community.members.splice(index, 1);
                    hasChanged = true;
                    break;
                }
            }
            async.parallel([
                function(cb) {
                    profile.save(cb);
                },
                function(cb) {
                    community.save(cb);
                }
            ], function(err) {
                cb(err);

                // cb(err, community, profile, hasChanged);
            });
        }
        // function(community, profile, hasChanged, cb) {
        //     // todo remove profile from the group chat
        //     notify(community, profile, 'deleted', hasChanged, cb);
        // }
    ], function(err) {
        if (err) {
            res.failure(err);
        } else {
            res.success();
        }
    });
};

// only status update supported - active, blocked, muted
// PUT communities/{communityId}/members/{profileId}
exports.update = function(req, res) {
    var model = req.body;
    //var profileId = req.params.id === 'me' ? req.user.profile.id : req.params.id;
    var profileId = req.params.id === 'me' ? req.profile.id : req.params.id;
    async.waterfall([
            function(cb) {
                getProfileAndCommunity(profileId, req.params.communityId, cb);
            },
            function(profile, community, cb) {

                var memberCommunity = _(profile.communities).find(function(item) {
                    return item.community.toString() === community.id.toString();
                });
                var member = _(community.members).find(function(item) {
                    return item.profile.toString() === profile.id.toString();
                });

                if (memberCommunity) {
                    memberCommunity.status = model.status;
                }
                if (member) {
                    member.status = model.status;
                }

                async.parallel([
                    function(cb) {
                        profile.save(cb);
                    },
                    function(cb) {
                        community.save(cb);
                    }
                ], function(err) {
                    cb(null, community, member);
                });

            },
            function(community, member, cb) {
                if (member) {
                    notifyToAllAdmins(community, member.status, req.profile, function(err) {
                        if (err) {
                            cb(err);
                        } else {
                            cb(null, member);
                        }
                    });
                }
            }
        ],
        function(err, member) {
            if (err) {
                res.failure(err);
            } else {
                res.data(mapper.toModel(member));
            }
        });
};

exports.search = function(req, res) {
    db.community.findOne({
            _id: req.params.communityId
        })
        .populate('members.profile')
        .exec(function(err, community) {
            res.log.silly(community.members);
            if (err) {
                return res.failure(err);
            }

            var members = _(community.members).filter(function(item) {
                return item.status !== 'deleted';
            });
            res.page(mapper.toSearchModel(members));
        });
};