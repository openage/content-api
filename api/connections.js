'use strict';
var async = require('async');
var notificationService = require('../services/notification');
var _ = require('underscore');
var mapper = require('../mappers/connection');
var db = require('mongoose').models;

var notify = function (hisProfile, hisConnection, myConnection, myProfile, hasChanged, cb) {
    var connection = mapper.toModel(hisConnection);

    if (hasChanged) {
        notificationService.notify(hisProfile, {
            entity: {
                id: connection.profile.id,
                name: myProfile.name,
                picData: myProfile.picData,
                picUrl: myProfile.picUrl,
                type: 'profile',
                data: connection.profile
            },
            api: 'connections',
            action: connection.status
        }, function () {
            cb(null, myConnection);
        });
    } else {
        cb(null, myConnection);
    }
};

var getConnections = function (myProfile, hisProfileId, callback) {
    db.profile.findOne({ _id: hisProfileId })
        .populate('connections user')
        .exec(function (err, hisProfile) {
            if (err) {
                return callback(err);
            }
            var hisConnection = _(hisProfile.connections).find(function (item) {
                return item.profile.toString() === myProfile.id;
            });
            var myConnection = _(myProfile.connections).find(function (item) {
                return item.profile.toString() === hisProfile.id;
            });

            // if (hisConnection) {
            //     hisConnection.profile = myProfile;
            // }

            // if (myConnection) {
            //     myConnection.profile = hisProfile;
            // }
            callback(null, hisProfile, hisConnection, myConnection);
        });
};

var updateStatus = function (myProfile, status, hisProfileId, callback) {
    async.waterfall([
        function (cb) {
            getConnections(myProfile, hisProfileId, cb);
        },
        function (hisProfile, hisConnection, myConnection, cb) {
            var hasChanged = false;

            if (!hisConnection || !myConnection) {
                callback('relationship does not exist');
            }

            switch (status) {
                case 'blocked':
                    if ('deleted|blocked'.indexOf(myConnection.status) === -1) {
                        myConnection.status = 'blocked';
                        hisConnection.status = 'blocked';
                        hasChanged = true;
                    }
                    break;
                case 'active':
                    if (myConnection.status === 'inComming') {
                        myConnection.status = 'active';
                        hisConnection.status = 'active';
                        hasChanged = true;
                    }
                    break;
                case 'deleted':
                    if (myConnection.status !== 'deleted') {
                        myConnection.status = 'deleted';
                        hisConnection.status = 'deleted';
                        hasChanged = true;
                    }
                    break;
                default:
                    break;
            }
            if (hasChanged) {
                async.parallel([
                    function (cb) {
                        myProfile.save(cb);
                    },
                    function (cb) {
                        hisProfile.save(cb);
                    }
                ], function (err) {
                    cb(err, hisProfile, hisConnection, myConnection, myProfile, hasChanged);
                });
            } else {
                cb(null, hisProfile, hisConnection, myConnection, myProfile, hasChanged);
            }
        },
        notify
    ], callback);
};

var api = exports;

// creates outGoing connection if none exist, 
// accepts a inComming connection
// does nothing in other cases
// POST connections { profile }
api.create = function (req, res) {
    // posted a profile
    var myProfile = req.profile;

    async.waterfall([
        function (cb) {
            getConnections(myProfile, req.body.profile.id, cb);
        },
        function (hisProfile, hisConnection, myConnection, cb) {
            var hasChanged = true;

            if (hisConnection && myConnection) {
                res.log.debug('already have the connection. mine', myConnection.status);
                res.log.debug('already have the connection. his:', hisConnection.status);

                if (hisConnection.status === 'outGoing') {
                    res.log.info('making connection active between profiles');
                    hisConnection.status = 'active';
                    myConnection.status = 'active';
                    var index = 0;
                    myProfile.notifications.forEach(function (notification) {
                        if (notification.data.entity.id === hisProfile.id) {
                            if (notification.data.action === 'inComming') {
                                res.log.debug('notification found. removing it');
                                myProfile.notifications.splice(index, 1);
                            }
                        }
                        index++;
                    });
                } else if ('outGoing|active'.indexOf(myConnection.status) === -1) {
                    res.log.info('resetting connection status to outGoing');
                    hisConnection.status = 'inComming';
                    myConnection.status = 'outGoing';
                } else {
                    res.log.info('cannot change the state of this connection');
                    hasChanged = false;
                }
            } else {
                res.log.info('creating new connection request');

                hisConnection = {
                    status: 'inComming',
                    profile: myProfile,
                    date: new Date(),
                    school: req.school.id
                };
                hisProfile.connections.push(hisConnection);
                myConnection = {
                    status: 'outGoing',
                    profile: hisProfile,
                    date: new Date(),
                    school: req.school.id
                };

                myProfile.connections.push(myConnection);
            }
            if (hasChanged) {
                async.parallel([
                    function (cb) {
                        myProfile.save(cb);
                    },
                    function (cb) {
                        hisProfile.save(cb);
                    }
                ], function (err) {
                    cb(err, hisProfile, hisConnection, myConnection, myProfile, hasChanged);
                });
            } else {
                cb(null, hisProfile, hisConnection, myConnection, myProfile, hasChanged);
            }
        },
        notify
    ],
        function (err, myConnection) {
            if (err) {
                res.failure(err);
            } else {
                res.data(mapper.toModel(myConnection));
            }
        });
};

// status = active, deleted
api.update = function (req, res) {
    var myProfile = req.profile;
    updateStatus(myProfile, req.body.status, req.params.id, function (err, connection) {
        if (err) {
            return res.failure(err);
        }
        if (connection.status !== req.body.status) {
            return res.failure('cannot change the status from: ' + connection.status + ' to: ' + req.body.status);
        }
        res.data(mapper.toModel(connection));

    });
};

// DELETE connections/{profileId}
api.delete = function (req, res) {
    var myProfile = req.profile;
    updateStatus(myProfile, 'deleted', req.params.id, function (err, item) {
        if (err) {
            res.failure(err);
        } else {
            res.success();
        }
    });
};

api.search = function (req, res) {
    db.profile.findOne({
        _id: req.profile.id
    })
        .populate({
            path: 'connections.profile',
            populate: {
                path: 'user'
            }
        })
        .exec(function (err, profile) {
            res.log.silly(profile.connections);
            if (err) {
                return res.failure(err);
            }

            var connections = _(profile.connections).filter(function (item) {
                return item.status !== 'deleted';
            });
            res.page(mapper.toSearchModel(connections));
        });


};
api.cancelRequest = function (req, res) {
    var myProfile = req.profile;

    if (req.params.id === myProfile.id) {
        return res.failure('enter requested or requesting profile id');
    }

    async.waterfall([
        function (cb) {
            getConnections(myProfile, req.params.id, cb);
        },
        function (hisProfile, hisConnection, myConnection, cb) {

            if (hisConnection.status === "outGoing" || myConnection.status === "inComming" &&
                hisConnection.status === "inComming" || myConnection.status === "outGoing") {

                hisProfile.connections.splice(hisProfile.connections.indexOf(hisConnection), 1);
                myProfile.connections.splice(myProfile.connections.indexOf(myConnection), 1);
                var index = 0;
                myProfile.notifications.forEach(function (notification) {
                    if (notification.data.entity.id === hisProfile.id) {
                        if (notification.data.action === 'inComming') {
                            res.log.debug('notification found. removing it');
                            myProfile.notifications.splice(index, 1);
                        }
                    }
                    index++;
                });
                index = 0;
                hisProfile.notifications.forEach(function (notification) {
                    if (notification.data.entity.id === myProfile.id) {
                        if (notification.data.action === 'inComming') {
                            res.log.debug('notification found. removing it');
                            hisProfile.notifications.splice(index, 1);
                        }
                    }
                    index++;
                });
                hisConnection.status = 'rejected';
                myConnection.status = 'rejected';
                async.parallel([
                    function (callback) {
                        hisProfile.save(callback);
                    },
                    function (callback) {
                        myProfile.save(callback);
                    }
                ], function (err) {
                    if (err) {
                        return cb(err);
                    }
                    cb(null, hisProfile, hisConnection, myConnection, myProfile, true);
                    // cb(null);
                });

            } else {
                cb('status mismatch');
            }

        },
        notify
    ], function (err) {
        if (err) {
            return res.failure(err);
        }
        res.success('request deleted');
    });
};