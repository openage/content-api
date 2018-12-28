'use strict';
var _ = require('underscore');

exports.toModel = function(data) {

    var model = {
        id: data.id,
        updated_At: data.updated_At
    };
    if (data.comment) {
        model.comment = data.comment;
    }
    if (data.attachment) {
        model.attachment = data.attachment;
    }
    if (data.profile) {
        model.profile = {
            id: data.profile.id,
            name: data.profile.name,
            picUrl: data.profile.picUrl,
            picData: data.profile.picData
        };
    }
    return model;
};

exports.toSearchModel = function(entities) {

    return _.map(entities, exports.toModel);

};