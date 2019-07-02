'use strict';
var uuid = require('uuid');
var async = require('async');
var db = require('mongoose').models;

var pushConfig = require('config').get('push');
var pushClient = require('../providers/' + pushConfig.provider);
var logger = require('@open-age/logger')('services.notification');


var getSubject = function (toProfile, data) {


    if (data.subject) {
        return data.subject;
    }

    return 'Aqua-Social';

    // if (data.entity.type === 'profile' && data.api === 'connections') {
    //     switch (data.action) {
    //         case 'active':
    //             {
    //                 return 'Friend Request Accepted !';
    //             }
    //         case 'blocked':
    //             {
    //                 return 'BLOCKED !';
    //             }
    //         case 'deleted':
    //             {
    //                 return 'DELETED !';
    //             }
    //         case 'inComming':
    //             {
    //                 return 'Incomming Friend Request !';
    //             }
    //     }
    // }

    // if (data.entity.type === 'community' && data.api === 'members') {
    //     switch (data.action) {
    //         case 'invited':
    //             {
    //                 return 'Community Invitation !';
    //             }
    //         case 'blocked':
    //             {
    //                 return 'BLOCKED !';
    //             }
    //         case 'deleted':
    //             {
    //                 return 'DELETED !';
    //             }
    //         case 'active':
    //             {
    //                 return 'Community Invitation Accepted !';
    //             }
    //         case 'updation':
    //             {
    //                 return 'Community Updated';
    //             }
    //     }
    //     // exept community invted all need to b done
    // }

    // if (data.entity.type === 'activity' && data.api === 'participants') {
    //     switch (data.action) {
    //         case 'invited':
    //             {
    //                 return 'Activity Invitation !';
    //             }
    //         case 'blocked':
    //             {
    //                 return 'BLOCKED !';
    //             }
    //         case 'deleted':
    //             {
    //                 return 'DELETED !';
    //             }
    //         case 'active':
    //             {
    //                 return 'Activity Invitation Accepted !';
    //             }
    //     }
    //     // exept activity invted all need to b done
    // }

    // if (data.entity.type === 'activity' && data.api === 'comments') {
    //     switch (data.action) {
    //         case 'created':
    //             {
    //                 return 'Comment Created';
    //             }
    //     }
    // }
    // if (data.entity.type === 'recipient' && data.api === 'profile/recipient') {
    //     switch (data.action) {
    //         case 'invited':
    //             {
    //                 return 'Recipient Invitation';
    //             }
    //         case 'updation':
    //             {
    //                 return 'Recipient Updated';
    //             }
    //     }
    // }

    // if (data.api === 'profiles' && data.entity.type === 'profile') {
    //     switch (data.action) {
    //         case 'updation':
    //             {
    //                 return 'Connections Updated';
    //             }
    //     }
    // }
    // todo form meaningful subject

};

var getMessage = function (toProfile, data) {
    var requestedPerson = data.entity.requstingPerson ? data.entity.requstingPerson.name : 'Someone';
    if (data.message) {
        return data.message;
    }

    if (data.entity.type === 'profile' && data.api === 'connections') {
        switch (data.action) {
            case 'active':
                {
                    return data.entity.name + ' and you are now connected!';
                }
            case 'blocked':
                {
                    return 'You have been Blocked by ' + data.entity.name;
                }
            case 'deleted':
                {
                    return 'You Removed from Connection by ' + data.entity.name;
                }
            case 'inComming':
                {
                    return data.entity.name + ' wants to connect with you.';
                }
            case 'rejected':
                {
                    return data.entity.name + ' has rejected your request.';
                }
        }
    }

    if (data.entity.type === 'community' && data.api === 'members') {
        switch (data.action) {
            case 'invited':
                {
                    return requestedPerson + ' has invited you to join the community ' + data.entity.data.subject;
                }
            case 'blocked':
                {
                    return 'You have been Blocked by ' + data.entity.name;
                }
            case 'deleted':
                {
                    return 'You Removed from Connection by ' + data.entity.name;
                }
            case 'active':
                {
                    return requestedPerson + ' has Joined your Community ' + data.entity.data.subject;
                }
            case 'updation':
                {
                    return 'Community Updated';
                }

        }
    }

    if (data.entity.type === 'activity' && data.api === 'participants') {
        switch (data.action) {
            case 'invited':
                {
                    return requestedPerson + ' has invited you to join the event ' + data.entity.data.subject;
                }
            case 'blocked':
                {
                    return 'You have been Blocked by ' + data.entity.name;
                }
            case 'deleted':
                {
                    return 'You Removed from Connection by ' + data.entity.name;
                }
            case 'active':
                {
                    if (data.entity.data.subject === "event") {
                        return requestedPerson + ' has joined your event ' + data.entity.data.subject;
                    }
                    return requestedPerson + ' has joined your post ' + data.entity.data.subject;
                }
            case 'updation':
                {
                    return 'Event Updated ' + data.entity.data.subject;
                }
        }
    }

    if (data.entity.type === 'activity' && data.api === 'admin') {
        switch (data.action) {
            case 'creation':
                {
                    return data.entity.data.subject;
                }
            case 'updation':
                {
                    return 'Updation : ' + data.entity.data.subject;
                }
        }
    }

    if (data.entity.type === 'activity' && data.api === 'comments') {
        switch (data.action) {
            case 'created':
                {
                    if (data.entity.data.type === "event") {
                        return requestedPerson + ' has commented on event ' + data.entity.data.subject;
                    }
                    return requestedPerson + ' has commented on post ' + data.entity.data.subject;

                }
            case 'updated':
                {
                    if (data.entity.data.type === "event") {
                        return requestedPerson + ' has update the comment on event ' + data.entity.data.subject;
                    }
                    return requestedPerson + ' has update the comment on post ' + data.entity.data.subject;
                }
        }
    }

    if (data.entity.type === 'community' && data.api === 'comments') {
        switch (data.action) {
            case 'created':
                {
                    return requestedPerson + ' has commented on community ' + data.entity.data.subject;
                }
            case 'updated':
                {
                    return requestedPerson + ' has update the comment on community ' + data.entity.data.subject;
                }
        }
    }

    if (data.entity.type === 'recipient' && data.api === 'profile/recipient') {
        switch (data.action) {
            case 'invited':
                {
                    return requestedPerson + ' want to share own recipient ' + data.entity.data.name + ' with you';
                }
            case 'accept':
                {
                    return 'Your recipient ' + data.entity.data.name + ' is now shared by ' + requestedPerson;
                }
            case 'updation':
                {
                    return 'Recipient Updated';
                }
        }
    }

    if (data.api === 'profiles' && data.entity.type === 'profile') {
        switch (data.action) {
            case 'updation':
                {
                    return 'Connections Updated';
                }
        }
    }
    if (data.api === 'admin' && data.entity.type === 'admin' || data.entity.type === 'employee') {
        switch (data.action) {
            case 'active':
                {
                    return 'Request has been accepted';

                }
            case 'rejected':
                {
                    return 'Request has been rejected';
                }
            case 'creation':
                {
                    return 'Admin has created a new post ' + data.entity.data.subject;
                }
            case 'updation':
                {
                    return 'Admin has updated a post ' + data.entity.data.subject;
                }
        }
    }

    if (data.api === '/admin/setmonitor' && data.entity.type === 'profile') {
        switch (data.action) {
            case 'rejectRequest':
                {
                    return 'You Are Accepted As Monitor';
                }
        }
    }

};
// todo form meaningful message

exports.notify = function (toProfile, data, callback) {
    var log = logger.start('notifyN');
    console.log("Strting notifyN");
    //data.entity.type=="profile" &&  data.api==connection
    var notificationObj = {
        date: new Date(),
        message: getMessage(toProfile, data),
        subject: getSubject(toProfile, data),
        data: {
            id: uuid.v1(),
            entity: {
                id: data.entity.id,
                type: data.entity.type,
                picData: data.entity.picData || '',
                picUrl: data.entity.picUrl || '',
            },
            api: data.api,
            action: data.action
        }
    };
    async.waterfall([
        function (cb) {

            if (toProfile._doc) {
                return cb(null, toProfile);
            }
            db.profile.findOne({
                _id: toProfile
            })
                .populate('user')
                .exec(cb);
        },
        function (profile, cb) {
            if (data.modelIncluded === false) {
                return cb(null, profile);
            }
            profile.notifications = profile.notifications || [];
            profile.notifications.push(notificationObj);
            profile.save(function (err) {
                cb(err, profile);
            });

        },
        function (profile, cb) {
            if (!profile.user.device || !profile.user.device.id) {
                log.info('device not set');
                console.log("device not set");
                return cb('device not set');
            }
            pushClient.push(profile.user.device.id, notificationObj, cb);
            console.log("notification sent");
        }
    ], callback);
};
