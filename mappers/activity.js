'use strict';
var _ = require('underscore');
var moment = require('moment');

var mapper = exports;

mapper.toModel = function(entity) {
    var model = {
        id: entity.id,
        subject: entity.subject,
        body: entity.body,
        type: entity.type, // post, event, task
        picUrl: entity.picUrl,
        picData: entity.picData,
        dueDate: entity.dueDate,
        icon: entity.icon,
        isPublic: entity.isPublic || true,
        status: entity.status,
        timeStamp: entity.updated_At

    };

       if (entity.owner) {
        if (entity.owner.user) {
            model.owner = {
                id: entity.owner.id,
                name: entity.owner.name
            };
        } else {
            model.owner = {
                id: entity.owner.toString()
            };
        }
    }
    if (entity.attachments) {
        model.attachments = [];

        if (!_.isEmpty(entity.attachments)) {
            model.attachments = entity.attachments.map(entity => {
                return {
                    picData: entity.picData,
                    picUrl: entity.picUrl,
                    mimeType: entity.mimeType,
                    name: entity.name
                };
            });
        }
    }

    if (entity.lastUpdate) {
        if (entity.lastUpdate.profile && entity.lastUpdate.profile._doc) {
            model.lastUpdate = {
                content: entity.lastUpdate.content,
                profile: {
                    id: entity.lastUpdate.profile.id,
                    name: entity.lastUpdate.profile.name,
                    picData: entity.lastUpdate.profile.picData,
                    picUrl: entity.lastUpdate.profile.picUrl
                }
            };
        } else {
            model.lastUpdate = {
                content: entity.lastUpdate.content,
                profile: entity.lastUpdate.profile
            };
        }
    }

    if (entity.community._doc) {
        model.community = {
            subject: entity.community.subject,
            id: entity.community.id,
            isDefault: entity.community.isDefault,
            isPublic: entity.community.isPublic
        };
    } else {
        if (entity.community) {
            model.community = {
                id: entity.community.toString()
            };
        }
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

    model.participants = [];
    _(entity.participants).each(function(item) {
        var profileExist = false;
        var participant = {
            date: item.date,
            status: item.status
        };
        if (item.profile) {
            _.each(model.participants, function(participant) {
                if (participant.profile.id === item.profile.id) {
                    profileExist = true;
                }
            });
            if (item.profile._doc) {
                participant.profile = {
                    id: item.profile.id,
                    name: item.profile.name,
                    picData: item.profile.picData,
                    picUrl: item.profile.picUrl
                };
            } else {
                participant.profile = {
                    id: item.profile.toString()
                };
            }
        } else {
            participant.profile = {};
        }

        if (item.status === 'admin') {
            model.admin = {
                id: participant.profile.id,
                name: participant.profile.name
            };
        }
        if (!profileExist) {
            model.participants.push(participant);
        }
    });

    return model;
};

mapper.toSearchModel = function(entities) {
    return _(entities).map(mapper.toModel);
};

mapper.toShortModel = function(entities) {
    return entities.map(function(entity) {
        var model = {};
        if (entity._doc) {
           //var differece = moment().diff(entity.dueDate, 'minutes');
           // if (differece < 0) {
                model = {
                    id: entity.id,
                    subject: entity.subject,
                    body: entity.body,
                    hashTag: entity.hashTag,
                    type: entity.type,
                    icon: entity.icon,
                    picUrl: entity.picUrl,
                    dueDate: entity.dueDate
                };
         //   }

        } else {
            model.id = entity.toString();
        }

        return model;
    });
};