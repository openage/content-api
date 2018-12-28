'use strict';
var _ = require('underscore');
var mapper = exports;

mapper.toModel = function(entity) {
    var model = {
        id: entity.id,
        date: entity.updated_At,
        text: entity.text

    };

    if (entity.community) {
        if (entity.community._doc) {
            model.community = {
                id: entity.community.id,
                subject: entity.community.subject
            };
        } else {
            model.community = {
                id: entity.community.id
            };
        }

    }

    if (entity.activity) {
        if (entity.activity._doc) {
            model.activity = {
                id: entity.activity.id,
                subject: entity.activity.subject,
                type: entity.activity.type
            };
        } else {
            model.activity = {
                id: entity.activity.id
            };
        }
    }
    if (entity.profile._doc) {
        model.profile = {
            id: entity.profile.id,
            name: entity.profile.name,
            picUrl: entity.profile.picUrl,
            picData: entity.profile.picData
        };
    } else {
        model.profile = {
            id: entity.profile.toString()
        };
    }
    return model;
};
mapper.toSearchModel = function(entities) {
    return _(entities).map(mapper.toModel);
};