'use strict';

exports.canCreate = function(req, callback) {
    var model = req.body;

    if (!model.phone && !model.facebookId) {
        return callback('phone or facebookId is required');
    }

    callback();
};