'use strict';
var _ = require('underscore');
var profileMapper = require('./profile');

var mapper = exports;

mapper.toLoginModel = function(user) {
    var model = mapper.toModel(user);
    model.token = user.token;
    model.chat.password = user.chat.password;
    return model;
};

mapper.toModel = function(user) {
    var model = {
        id: user.id,
        status: user.status,
        phone: user.phone,
        facebookId: user.facebookId,
        password: user.password,

        chat: {
            id: user.chat.id,
        }
    };
    if (user.device) {
        model.device = {
            id: user.device.id
        };
    }

    if (user.profile) {
        if (user.profile._doc) {
            model.profile = {
                id: user.profile.id,
                status: user.profile.status,
                name: user.profile.name,
                picData: user.profile.picData,
                picUrl: user.profile.picUrl,
                type: user.profile.type,
                course: user.profile.course,
                gender: user.profile.gender,
                dateOfBirth: user.profile.dateOfBirth
            };

        } else {
            model.profile = {
                id: user.profile.toString()
            };
        }
        if (user.profile.course) {
            model.profile.course = user.profile.course;
        }
        if (user.profile.batchNo) {
            model.profile.batchNo = user.profile.batchNo;
        }
        if (user.profile.defaultCommunity) {
            model.profile.defaultCommunity = user.profile.defaultCommunity;
        }
        if (user.profile.employeeNo) {
            model.profile.employeeNo = user.profile.employeeNo;
        }
    }

    return model;
};

mapper.toSearchModel = function(entities) {
    return _(entities).map(mapper.toModel);
};