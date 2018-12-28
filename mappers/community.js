'use strict';

var _ = require('underscore');
var moment = require('moment');

var mapper = exports;


mapper.toModel = function (data) {
    var community = {
        isPublic : data.isPublic,
        isDefault: data.isDefault,
    }
    var model = {
        id: data.id,
        subject: data.subject,
        body: data.body,
        picUrl: data.picUrl,
        picData: data.picData,
        icon: data.icon,
        status: data.status,
        priority: data.priority,
        canSeePost: data.canSeePost,
        unreadCount: data.unreadCount || 0,
        friendsCount: data.friendsCount || 0,
        isPublic: data.isPublic,
        isDefault: data.isDefault,
        isArchive: data.isArchive || false,
        isFollowable: data.isFollowable,
        course: data.course,
        feedUrl: data.feedUrl
        // membersCount: data.members.length || 0
    };

    model.updated_At = data.updated_At;
    model.created_At = data.created_At;


    if (data.owner) {
        if (data.owner.user) {
            model.owner = {
                id: data.owner.id,
                name: data.owner.name
            };
        } else {
            model.owner = {
                id: data.owner.toString()
            };
        }
    }

    if (data.school) {
        if (data.school._doc) {
            model.school = {
                id: data.school.id,
                name: data.school.name,
                code: data.school.code
            };
        } else {
            model.school = {
                id: data.school.toString()
            };
        }
    }


    // if (!_.isEmpty(data.activities)) {
    //     model.activities = [];
    //     if (data.activities[0]._doc) {
    //         var latestActivities = [];
    //         var activities = data.activities.sort(function(a, b) {
    //             return b.updated_At - a.updated_At;
    //         });
    //         latestActivities = [activities[0], activities[1], activities[2]];

    //         _.each(latestActivities, function(item) {
    //             if (item) {
    //                 var activity = {
    //                     id: item.id,
    //                     subject: item.subject,
    //                     body: item.body,
    //                     type: item.type,
    //                     dueDate: item.dueDate,
    //                     updated_At: item.updated_At,
    //                     lastUpdate: {
    //                         content: item.lastUpdate.content,
    //                         profile: item.lastUpdate.profile
    //                     }
    //                 };
    //                 model.activities.push(activity);
    //             }
    //         });
    //     } else {
    //         _.each(data.activities, function(item) {
    //             model.activities.push({
    //                 id: item.toString()
    //             });
    //         });
    //     }

    // } else {
    //     model.activities = [];
    // }


    if (data.location) {
        model.location = {
            name: data.location.name,
            description: data.location.description,
            coordinates: []
        };

        _(data.location.coordinates).each(function (item) {
            model.location.coordinates.push(item);
        });
    }

    if (data.interests) {
        model.interests = [];
        _(data.interests).each(function (item) {
            if (item.name) {
                model.interests.push({
                    id: item.id,
                    name: item.name
                });
            } else {
                model.interests.push({
                    id: item.toString()
                });
            }
        });
    }

    if (data.tags) {
        model.tags = [];
        _(data.tags).each(function (item) {
            if (item.name) {
                model.tags.push({
                    id: item.id,
                    name: item.name
                });
            } else {
                model.tags.push({
                    id: item.toString()
                });
            }
        });
    }
    if (data.followers) {
        model.followers = [];
        _(data.followers).each(function (item) {
            if (item.subject) {
                model.followers.push({
                    id: item.id,
                    subject: item.subject,
                    feedUrl: item.feedUrl
                });
            } else {
                model.followers.push({
                    id: item.toString()
                });
            }
        });
    }

    model.activities = [];
    if (data.followers.length > 0) {
        _(data.followers).each(function (item) {
            _(item.activities).each(function (element) {
                var community ={
                    isPublic: element.isPublic,
                    isDefault: element.isDefault
                }
                model.activities.push({
                    id: element.id,
                    subject: element.subject,
                    body: element.body,
                    type: element.type,
                    icon: element.icon,
                    picUrl: element.picUrl,
                    dueDate: element.dueDate,
                    feedUrl: element.feedUrl,
                    timeStamp: element.updated_At,
                    community: community
                });
            })
        })
    }
    if (data.activities) {
        _(data.activities).each(function (item) {
            if (item.dueDate) {
                var differece = moment().diff(item.dueDate, 'minutes');
                if (differece < 0) {
                    model.activities.push({
                        id: item.id,
                        subject: item.subject,
                        body: item.body,
                        type: item.type,
                        icon: item.icon,
                        picUrl: item.picUrl,
                        feedUrl: item.feedUrl,
                        dueDate: item.dueDate,
                        timeStamp: item.updated_At,
                        community: community
                    });
                }
            } else {
                model.activities.push({
                    id: item.id,
                    subject: item.subject,
                    body: item.body,
                    type: item.type,
                    icon: item.icon,
                    picUrl: item.picUrl,
                    feedUrl: item.feedUrl,
                    dueDate: item.dueDate,
                    timeStamp: item.updated_At,
                    community: community
                });
            }
        });

    }

    if (data.getMyClass) { // get MyClass MemberType Wise

        model.students = [];
        model.teachers = [];

        _(data.members).each(function (member) {
            if (member.status === 'waiting') {
                return;
            }

            if (member.profile && member.profile._doc) {

                if (member.profile.type === 'student' && member.status === "active") {
                    model.students.push({
                        isModerator: member.isModerator,
                        status: member.status,
                        profile: {
                            id: member.profile.id,
                            name: member.profile.name,
                            code: member.profile.code,
                            picUrl: member.profile.picUrl,
                            desigination: member.profile.desigination,
                            picData: member.profile.picData,
                            dateOfBirth: member.profile.dateOfBirth,
                            about: member.profile.about,
                            chat: {
                                id: member.profile.chat.id
                            }
                        }
                    });
                } else {

                    model.teachers.push({
                        isModerator: member.isModerator,
                        status: member.status,
                        profile: {
                            id: member.profile.id,
                            name: member.profile.name,
                            code: member.profile.code,
                            picUrl: member.profile.picUrl,
                            desigination: member.profile.desigination,
                            picData: member.profile.picData,
                            dateOfBirth: member.profile.dateOfBirth,
                            about: member.profile.about,
                            chat: {
                                id: member.profile.chat.id
                            }
                        }
                    });


                }

            } else {
                model.students.push({
                    isModerator: member.isModerator,
                    status: member.status,
                    profile: {
                        id: member.profile ? member.profile.toString() : null
                    }
                });
            }
        });
        model.activities = _.sortBy(model.activities, "dueDate");

        return model; //not including members array

    }


    model.members = [];

    if (data.members) {
        _(data.members).each(function (item) {
            /////////////HACK//////////////////////
            /////////////HACK//////////////////////
            /////////////HACK//////////////////////
            if (!item.profile) {
                return;
            }
            /////////////HACK//////////////////////
            /////////////HACK//////////////////////
            /////////////HACK//////////////////////

            if (item.profile._doc) {
                model.members.push({
                    isModerator: item.isModerator,
                    muted: item.muted,
                    deactivated: item.deactivated,
                    status: item.status,
                    profile: {
                        id: item.profile.id,
                        name: item.profile.name,
                        code: item.profile.code,
                        picUrl: item.profile.picUrl,
                        desigination: item.profile.desigination,
                        picData: item.profile.picData,
                        about: item.profile.about,
                        chat: {
                            id: item.profile.chat.id
                        }
                    }
                });
            } else {
                model.members.push({
                    id: item.profile.toString(),
                    status: item.status,
                    profile: {
                        id: item.profile.toString()
                    }
                });
            }
        });
    }
    model.activities = _.sortBy(model.activities, "dueDate");

    return model;
};
mapper.toAgendaModel = function (data) {
    var model = {
        subject: "Today's Agenda",
        body: "This is Today's Agenda",
        picUrl: "http://www.mwca-nepean.ca/wp-content/uploads/2016/08/agenda.jpg",
        icon: "TodayAgenda "
    };
    model.activities = [];

    _.each(data, function (item) {
        if (item) {
            model.activities.push({
                subject: item.subject,
                body: item.body,
                picUrl: item.picUrl,
                status: item.status,
                type: item.type,
                dueDate: item.dueDate
            });
        }
    });

    return model;
};
mapper.toCommunityInfo = function (data) {
    var model = {
        id: data.id,
        subject: data.subject,
        body: data.body,
        picUrl: data.picUrl,
        picData: data.picData,
        icon: data.icon,
        priority: data.priority,
        canSeePost: data.canSeePost,
        unreadCount: data.unreadCount || 0,
        friendsCount: data.friendsCount || 0,
    };

    if (data.owner) {
        if (data.owner.user) {
            model.owner = {
                id: data.owner.id,
                name: data.owner.name
            };
        } else {
            model.owner = {
                id: data.owner.toString()
            };
        }
    }
    return model;
};
mapper.toDiscover = function (communitieslist) {
    var communities = [];
    if (!_.isEmpty(communitieslist)) {
        _.each(communitieslist, function (data) {
            var model = {
                id: data.id,
                subject: data.subject,
                body: data.body,
                picUrl: data.picUrl,
                picData: data.picData,
                icon: data.icon,
                isPublic: data.isPublic,
                isDefault: data.isDefault,
                priority: data.priority,
                canSeePost: data.canSeePost,
                unreadCount: data.unreadCount || 0,
                friendsCount: data.friendsCount || 0,
                membersCount: data.members.length || 0
            };

            if (data.owner) {
                if (data.owner.user) {
                    model.owner = {
                        id: data.owner.id,
                        name: data.owner.name
                    };
                } else {
                    model.owner = {
                        id: data.owner.toString()
                    };
                }
            }
            if (data.location) {
                model.location = {
                    name: data.location.name,
                    description: data.location.description,
                    coordinates: []
                };
                _(data.location.coordinates).each(function (item) {
                    model.location.coordinates.push(item);
                });
            }
            communities.push(model);

        });
    }
    return communities;
};
mapper.toRecentActivities = function (data) {
    var model = {
        subject: "Recent Acitivity",
        picUrl: "",
        icon: ""
    };
    if (data) {
        model.activities = [];
        _.each(data, function (item) {
            if (item) {
                model.activities.push({
                    subject: item.subject,
                    body: item.body,
                    picUrl: item.picUrl,
                    status: item.status,
                    type: item.type,
                    dueDate: item.dueDate
                });
            }
        });
    }
    return model;
};
mapper.toMembers = function (data) {
    var model = {
        subject: data.members.length + " Members",
        icon: ""
    };
    if (!_.isEmpty(data.members)) {
        model.members = [];
        _(data.members).each(function (item) {
            if (item.profile._doc) {
                model.members.push({
                    isModerator: item.isModerator,
                    status: item.status,
                    profile: {
                        id: item.profile.id,
                        name: item.profile.name,
                        code: item.profile.code,
                        picUrl: item.profile.picUrl,
                        desigination: item.profile.desigination,
                        picData: item.profile.picData,
                        about: item.profile.about,
                        chat: {
                            id: item.profile.chat.id
                        },


                    }
                });
            } else {
                model.members.push({
                    id: item.profile.toString(),
                    status: item.status,
                    profile: {
                        id: item.profile.toString()
                    }
                });
            }
        });
    }
    return model;
};
mapper.toUpcomingEvents = function (data) {
    var model = {
        subject: "Upcoming Events",
        icon: ""
    };
    if (data) {
        model.activities = [];
        model.activities = data;
    }
    return model;
};

mapper.toShortModel = function (entities) {


    return _.map(entities, function (entity) {
        var community = {
            isPublic: entity.isPublic,
            isDefault: entity.isDefault
        };
        var model = {
            id: entity.id,
            subject: entity.subject,
            body: entity.body,
            picUrl: entity.picUrl,
            picData: entity.picData,
            icon: entity.icon,
            status: entity.status,
            priority: entity.priority,
            canSeePost: entity.canSeePost,
            unreadCount: entity.unreadCount || 0,
            friendsCount: entity.friendsCount || 0,
            isPublic: entity.isPublic,
            isDefault: entity.isDefault,
            course: entity.course,
            school: entity.school.code,
            isArchive: entity.isArchive || false,
            // membersCount: data.members.length || 0
        };

        model.activities = [];

        // if (!_.isEmpty(entity.activities)) {
        //     model.activities = [];
        //     if (entity.activities[0]._doc) {
        //         var latestActivities = [];
        //         var activities = entity.activities.sort(function(a, b) {
        //             return b.updated_At - a.updated_At;
        //         });
        //         latestActivities = [activities[0], activities[1], activities[2]];

        //         _.each(latestActivities, function(item) {
        //             if (item) {
        //                 var activity = {
        //                     id: item.id,
        //                     subject: item.subject,
        //                     body: item.body,
        //                     type: item.type,
        //                     dueDate: item.dueDate,
        //                     updated_At: item.updated_At,
        //                     lastUpdate: {
        //                         content: item.lastUpdate.content,
        //                         profile: item.lastUpdate.profile
        //                     }
        //                 };
        //                 model.activities.push(activity);
        //             }
        //         });
        //     } else {
        //         _.each(entity.activities, function(item) {
        //             model.activities.push({
        //                 id: item.toString()
        //             });
        //         });
        //     }

        // }

        model.activities = [];
        if (entity.followers.length > 0) {
            _(entity.followers).each(function (item) {
                _(item.activities).each(function (element) {
                    var community ={
                        isPublic : element.isPublic,
                        isDefault : element.isDefault
                    }
                    if (element.dueDate) {
                        var differece = moment().diff(element.dueDate, 'minutes');
                        if (differece < 0) {
                            model.activities.push({
                                id: element.id,
                                subject: element.subject,
                                body: element.body,
                                type: element.type,
                                icon: element.icon,
                                picUrl: element.picUrl,
                                dueDate: element.dueDate,
                                feedUrl: element.feedUrl,
                                timeStamp: element.updated_At,
                                community: community
                            });
                        }
                    } else {
                        model.activities.push({
                            id: element.id.toString(),
                            subject: element.subject,
                            body: element.body,
                            type: element.type,
                            icon: element.icon,
                            picUrl: element.picUrl,
                            dueDate: element.dueDate,
                            feedUrl: element.feedUrl,
                            timeStamp: element.updated_At,
                            community: community
                        });
                    }

                })
            })
        }
        if (entity.activities) {

            _(entity.activities).each(function (item) {
                if (item.dueDate) {
                    var differece = moment().diff(item.dueDate, 'minutes');
                    if (differece < 0) {
                        model.activities.push({
                            id: item.id,
                            subject: item.subject,
                            body: item.body,
                            type: item.type,
                            icon: item.icon,
                            picUrl: item.picUrl,
                            dueDate: item.dueDate,
                            feedUrl: item.feedUrl,
                            timeStamp: item.updated_At,
                            community: community
                        });
                    }
                } else {
                    model.activities.push({
                        id: item.id.toString(),
                        subject: item.subject,
                        body: item.body,
                        type: item.type,
                        icon: item.icon,
                        picUrl: item.picUrl,
                        dueDate: item.dueDate,
                        feedUrl: item.feedUrl,
                        timeStamp: item.updated_At,
                        community: community
                    });
                }
            });
        }
        model.activities = _.sortBy(model.activities, "dueDate");
        return model;
    });

};