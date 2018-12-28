'use strict';
var _ = require('underscore');

var mapper = exports;
mapper.toBatchModel = function(entity) {
    var batches = [];
    var count = 0;
    _(entity.batches).each(function(batch) {
        if (!batch.batch) {
            return;
        }
        // var model = {};
        if (batch._doc) {
            // batches.push({
            //     name: batch.batch.subject,
            //     id: batch.batch.id.toString()
            // });
            var model = {
                name: batch.batch.subject,
                id: batch.batch.id.toString(),
                status: batch.batch.status || 'active',
                membersCount: batch.batch.members.length || 0,
                members: batch.batch.members
            };
            if (batch.batch.owner) {
                model.owner = {
                    id: batch.batch.owner.id.toString(),
                    name: batch.batch.owner.name,
                    code: batch.batch.owner.code
                };
            }
            if (batch.batch.members) {
                batch.batch.members.forEach(function(member) {
                    if (member.profile.type === 'student') {
                        count++;
                    }
                });
                model.studentsCount = count;
                count = 0;
            }
            batches.push(model);
        }
    });
    return batches;
};