'use strict';
var moment = require('moment');

var mapper = exports;

mapper.toModel = function (entity) {
    var model = {
        id: entity.id,
        subject: entity.subject,
        body: entity.body,
        type: entity.type, // post, event, task
        dueDate: entity.dueDate,
        date: entity.date,
        startTime: entity.startTime,
        endTime: entity.endTime,
        icon: entity.icon,
        isPublic: entity.isPublic || true,
        status: entity.status,
        religion: entity.religion,
        pic: {},
        timeStamp: entity.updated_At
    };

    if (entity.pic) {
        let pic = entity.pic
        if (pic.url) {
            model.pic.url = pic.url
        }
    }

    if (entity.address) {
        model.address = entity.address.toObject()
    }

    return model;
};
mapper.toSearchModel = (entities) => {
    return entities.map((entity) => {
        return exports.toModel(entity)
    })
};
