'use strict';

var _ = require('underscore');

var mapper = exports;


mapper.toModel = function(data) {
    var model = {
        code: data.code,
        picUrl: data.picUrl,
        picData: data.picData,
        name: data.name,
        orgCode: data.orgCode,
        logo: data.logo,
        about: data.about,
        status: data.status,
        hasCourses: data.hasCourses
    };

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

    return model;
};

mapper.toSchoolModel = function(entities) {
    return _(entities).map(mapper.toModel);
};