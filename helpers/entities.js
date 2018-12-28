'use strict';

module.exports = function(entity) {
    return {
        set: function(model, fields) {
            for (var index in fields) {
                var field = fields[index];
                if (model[field] || model[field] === "" || model[field] === false) {
                    entity[field] = model[field];
                }
            }
            return entity;
        }
    };
};