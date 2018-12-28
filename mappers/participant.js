'use strict';
var _ = require('underscore');

var mapper = exports;

mapper.toModel = function(entity) {
    if (!entity.profile._doc) {
        return {
            id: entity.profile.toString(),
            status: entity.status,
            profile: {
                id: entity.profile.toString()
            },
            date: entity.date
        };
    }

    return {
        id: entity.profile.id,
        status: entity.status,
        profile: {
            id: entity.profile.id,
            name: entity.profile.name,
            picUrl: entity.profile.picUrl,
            picData: entity.profile.picData,
            lastSeen: entity.profile.lastSeen,
            chat: {
                id: entity.profile.chat.id
            }
        },
        date: entity.date
    };

};

mapper.toSearchModel = function(entities) {
    return _(entities).map(mapper.toModel);
};