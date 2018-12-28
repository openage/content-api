'use strict';

exports.canCreate = function(req, callback) {
    var model = req.body;

    if (!model.name && !model.id) {
        return callback('name or id is required');
    }

    callback();
};