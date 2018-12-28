'use strict';

var _ = require('underscore');

var mapper = exports;


mapper.toModel = function(data) {
    var model = {
        id: data.id,
        name: data.name,
        status: data.status,
        isArchive: data.isArchive
    };

    if (data.batches) {
        model.batches = [];
        _.each(data.batches, function(item) {
            model.batches.push({
                name: item.name,
                status: item.status,
                batch: item.batch
            });
        });

    }

    return model;
};
mapper.toBatchModel = function(data) {
    var model = {
        name: data.subject,
        status: data.status,
        batch: data.id
    }
    return model;
};
mapper.toShortModel = function(data) {
    var model = {
        name: data.name,
        id: data.id
    }
    return model;
};
mapper.toCourseModel = function(data) {
    return _(data).map(mapper.toModel);
};

mapper.toSchoolWiseModel = function(data) {
    var model = {
        name: data.course.name,
        id: data.course.id,
        isArchive: data.course.isArchive
    }
    return model;
};