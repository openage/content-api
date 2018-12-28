'use strict';
var db = require('mongoose').models;
var _ = require('underscore');

var mapper = exports;


mapper.toModel = function(data) {
    var communities = [];
    var model = {
        id: data.id,
        subject: data.subject,
        body: data.body,
        picUrl: data.picUrl,
        picData: data.picData,
        icon: data.icon,
        priority: data.priority
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


    if (data.length >= 1) {
        model.activities = [];
        if (data.activities[0]._doc) {
            var latestActivities = [];
            var activities = data.activities.sort(function(a, b) {
                return b.updated_At - a.updated_At;
            });
            latestActivities = [activities[0], activities[1], activities[2]];

            _.each(latestActivities, function(item) {
                if (item) {
                    var activity = {
                        id: item.id,
                        subject: item.subject,
                        body: item.body,
                        type: item.type,
                        dueDate: item.dueDate,
                        updated_At: item.updated_At,
                        lastUpdate: {
                            content: item.lastUpdate.content,
                            profile: item.lastUpdate.profile
                        }
                    };
                    model.activities.push(activity);
                }
            });
        } else {
            _.each(data.activities, function(item) {
                model.activities.push({
                    id: item.toString()
                });
            });
        }

    } else {
        model.activities = [];
    }
    model.updated_At = data.updated_At;
    model.created_At = data.created_At;

    if (data.isPublic) {
        model.isPublic = data.isPublic;
    }
    if (data.isDefault) {
        model.isDefault = data.isDefault;

    }

    if (data.location) {
        model.location = {
            name: data.location.name,
            description: data.location.description,
            coordinates: []
        };

        _(data.location.coordinates).each(function(item) {
            model.location.coordinates.push(item);
        });
    }

    if (data.interests) {
        model.interests = [];
        _(data.interests).each(function(item) {
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
        _(data.tags).each(function(item) {
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
    if (data.activities) {
        model.activities = [];
        _(data.activities).each(function(item) {
            if (item) {
                model.activities.push({
                    id: item.id,
                    subject: item.subject,
                    body: item.body,
                    type: item.type,
                    picUrl: item.picUrl,
                    dueDate: item.dueDate,
                });

            } else {
                model.activities.push({
                    id: item.id
                });
            }
        });
    }
    if (data.members) {
        model.communities = [];

        var students = {
            subject: "Students",
            picUrl: "",
            status: "active",
            icon: "ClassRoom"
        };
        var teachers = {
            subject: "Teachers",
            picUrl: "",
            status: "active",
            icon: "ClassRoom"
        };
        students.members = [];
        teachers.members = [];
        model.members = [];
        _(data.members).each(function(item) {
            if (item.profile) {
                if (item.profile.batchNo === model.subject && item.status === "active") {
                    students.members.push({
                        isModerator: item.isModerator,
                        status: item.status,
                        profile: {
                            id: item.profile.id,
                            name: item.profile.name,
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
                    if (item.status === "active") {
                        teachers.members.push({
                            isModerator: item.isModerator,
                            status: item.status,
                            profile: {
                                id: item.profile.id,
                                name: item.profile.name,
                                picUrl: item.profile.picUrl,
                                desigination: item.profile.desigination,
                                picData: item.profile.picData,
                                about: item.profile.about,
                                chat: {
                                    id: item.profile.chat.id
                                }
                            }
                        });
                    }

                }

            } else {
                model.members.push({
                    id: item.profile,
                    status: item.status,
                    profile: {
                        id: item.profile
                    }
                });
            }
        });
        communities.push(model);
        communities.push(students);
        communities.push(teachers);
    }
    return communities;
};
mapper.toWaitingStudents = function(data) {
    var model = {
        subject: "Waiting Students",
        body: "Waiting Students",
        picUrl: "http://images.mydoorsign.com/img/lg/S/Waiting-Room-Tactile-Braille-Sign-SE-5259.gif",
        icon: "ClassRoom"
    };
    if (data.members) {
        model.members = [];
        _(data.members).each(function(item) {
            if (item.profile._doc) {
                if (item.profile.isWaiting && item.profile.batchNo) {
                    model.members.push({
                        isModerator: item.isModerator,
                        isWaiting: item.profile.isWaiting,
                        profile: {
                            id: item.profile.id,
                            name: item.profile.name,
                            picUrl: item.profile.picUrl,
                            picData: item.profile.picData,
                            about: item.profile.about,
                            chat: {
                                id: item.profile.chat.id
                            }
                        }
                    });
                }

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
mapper.toPublicDefaultCommunities = function(activities) {
    var model = {
        subject: "Public Default Communities",
        body: "Public Default Communities",
        picUrl: "https://encrypted-tbn1.gstatic.com/images?q=tbn:ANd9GcRltvFvlEZRf9waY0kg5jWPsa9dveYWoS7SE8KC_u3SfiZqtRHzoQ",
        icon: "DefaultCommunity"
    };
    if (activities) {
        model.activities = [];
        _(activities).each(function(activity) {
            if (activity.community.isDefault === true && activity.community.isPublic === true) {
                if (model.activities.length !== 3) {
                    model.activities.push({
                        subject: activity.subject,
                        body: activity.body,
                        picUrl: activity.picUrl,
                        dueDate: activity.dueDate,
                        id: activity.id,
                        hashTag: activity.community.subject

                    });
                }

            }

        });
    }
    return model;
};
mapper.toMyCommunities = function(communities) {
    var model = {
        subject: "My Communities",
        body: "",
        picUrl: "",
        icon: "PublicDefaultCommunity",

    };
    if (communities) {
        model.activities = [];
        _.each(communities, function(item) {
            if (item) {
                var activity = {
                    id: item.id,
                    subject: item.subject,
                    body: item.body,
                    picUrl: item.picUrl,
                    canSeePost: item.canSeePost,
                    unreadCount: item.unreadCount || 0,
                    friendsCount: item.friendsCount || 0,
                    membersCount: item.members.length || 0
                };
                model.activities.push(activity);
            }
        });

    }
    return model;
};

mapper.toSearchModel = function(data) {
    return _(data).map(mapper.toModel);
};