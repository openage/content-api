'use strict';
var notificationService = require('../services/notification');


exports.updation = function(profileId, data, entityType, entityId, cb) {
    notificationService.notify(profileId, {
        entity: {
            id: entityId,
            type: entityType
        },
        api: data.api,
        action: data.action,
        modelIncluded: data.modelIncluded
    }, function() {
        cb(null);
    });
};