'use strict';
var _ = require('underscore');

var mapper = exports;

mapper.toModel = function(entity) {
    return {
        id: entity.id,
        name: entity.name,
        tag:entity.tag
    };
};

mapper.toSearchModel = function(entities) {
    return _(entities).map(mapper.toModel);
};