'use strict';
var _ = require('underscore');

var mapper = exports;
var profileId;
mapper.toModel = function(data) {

    var model = {
        id: data.id,
        picUrl: data.picUrl,
        picData: data.picData,
        name: data.name,
        code: data.code,
        age: data.age,
        course: data.course,
        dateOfBirth: data.dateOfBirth,
        type: data.type,
        gender: data.gender,
        about: data.about,
        lastSeen: data.lastSeen,
        isWaiting: data.isWaiting,
        desigination: data.desigination,
        status: data.status,
        rollNo: data.rollNo,
        defaultCommunity: data.defaultCommunity,
        updated_At: data.updated_At,
        isPublic: data.isPublic
    };

    if (data.batchNo) {
        model.course = data.course;
        model.batchNo = data.batchNo;
        model.course = data.course;
    }
    if (data.employeeNo) {
        model.employeeNo = data.employeeNo;
    }

    if (data.location) {
        model.location = {
            name: data.location.name,
            description: data.location.description,
            coordinates: data.location.coordinates
        };
    }
    if (data.user._doc) {
        model.user = {
            phone: data.user.phone,
            status: data.user.status,
            chat: {
                id: data.user.chat.id
            }
        };
        model.chat = {
            id: parseInt(data.user.chat.id, 10)
        };
    }

    if (data.chat) {
        if (!model.chat) {
            model.chat = {
                id: parseInt(data.chat.id, 10)
            };
        }
    }

    if (data.interests) {
        model.interests = [];
        _(data.interests).each(function(interest) {
            if (interest._doc) {
                model.interests.push({
                    id: interest.id,
                    name: interest.name
                });
            } else {
                model.interests.push({
                    id: interest.toString(),
                });
            }
        });
    }
    if (data.connections) {
        model.connections = [];
        _(data.connections).each(function(connection) {
            model.connections.push({
                id: connection.id.toString(),
                status: connection.status,
                date: connection.date,
                profile: {
                    id: connection.profile.toString()
                }
            });
        });
    }

    if (data.tags) {
        model.tags = [];
        _(data.tags).each(function(tag) {
            if (tag._doc) {
                model.tags.push({
                    id: tag.id,
                    name: tag.name
                });
            } else {
                model.tags.push({
                    id: tag.toString(),
                });
            }
        });
    }

    if (data.loops) {
        model.loops = [];
        _(data.loops).each(function(loop) {
            model.loops.push({
                role: loop.role,
                profile: {
                    id: loop.profile.id
                },
                id: loop.id
            });
        });
    }

    if (data.providers) {
        model.providers = [];
        _(data.providers).each(function(provider) {
            model.providers.push({
                phone: provider.phone,
                name: provider.name
            });
        });
    }

    if (data.recipients) {

        model.recipients = [];
        _(data.recipients).each(function(item) {
            var recipient = {
                name: item.name,
                picUrl: item.picUrl,
                picData: item.picData,
                id: item.id
            };
            model.recipients.push(recipient);

        });
    }

    if (data.loops) {
        model.loops = [];
        _(data.loops).each(function(item) {
            var loop = {
                id: item.id,
                status: item.status,
                role: item.role
            };
            if (item.profile.id === profileId) {
                model.role = item.role;
            }
            if (item.profile._doc) {
                loop.profile = {
                    id: item.profile.id,
                    name: item.profile.name,
                    picUrl: item.profile.picUrl,
                    picData: item.profile.picData
                };
            } else {
                loop.profile = item.profile;
            }
            model.loops.push(loop);
        });

    }
    return model;
};

mapper.toRecipientModel = function(entity) {
    var model = mapper.toModel(entity);

    model.conditions = entity.conditions;


    // todo - add more data here

    return model;


};

mapper.toMyProfileModel = function(entity) {
    var model = mapper.toRecipientModel(entity);
    model.status = entity.status;

    if (entity.communities) {
        model.communities = [];
        _(entity.communities).each(function(membership) {
            model.communities.push({
                id: membership.community, //.toString(),
                status: membership.status,
                date: membership.date,
                community: {
                    id: membership.community //.toString()
                }
            });
        });
    }

    if (entity.connections) {
        model.connections = [];
        _(entity.connections).each(function(connection) {
            model.connections.push({
                id: connection.id.toString(),
                status: connection.status,
                date: connection.date,
                profile: {
                    id: connection.profile.toString()
                }
            });
        });
    }

    if (entity.images) {
        model.images = [];
        _(entity.images).each(function(image) {
            model.images.push({
                order: image.order,
                url: image.url
            });
        });
    }

    if (entity.location) {
        model.location = {
            name: entity.location.name,
            description: entity.location.description,
            coordinates: []
        };

        _(entity.location.coordinates).each(function(item) {
            model.location.coordinates.push(item);
        });
    }

    return model;
};

mapper.toSearchModel = function(entities, id) {

    return entities.map(function(entity) {
        return {
            id: entity.id,
            picUrl: entity.picUrl,
            picData: entity.picData,
            name: entity.name,
            code: entity.code,
            status: entity.status,
            isPublic: entity.isPublic
        };
    });
};

mapper.discoverPublicProfiles = function(entities) {
    return _.map(entities, function(item) {
        var profileModel = {
            id: item.id,
            picUrl: item.picUrl,
            picData: item.picData,
            name: item.name,
            about: item.about
        };
        if (item.defaultCommunity) {
            profileModel.defaultCommunity = item.defaultCommunity.toString();
        }
        return profileModel;
    });
};