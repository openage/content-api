'use strict';
var _ = require('underscore');

var mapper = exports;

mapper.toModel = function(obj) {
    var model = {
        id: obj.data.id || obj.data.trackingId,
        date: obj.date,
        subject: obj.subject,
        message: obj.message,
        data: {
            entity: {
                id: obj.data.entity.id,
                picData: obj.data.entity.picData,
                picUrl: obj.data.entity.picUrl,
                type: obj.data.entity.type
            },
            api: obj.data.api,
            action: obj.data.action
        }
    };

    return model;
};

mapper.toSearchModel = function(entities) {
    return _(entities).map(mapper.toModel);
};