'use strict';
var _ = require('underscore');

var mapper = exports;
mapper.toStatusModel = function (entity) {
    var model = {
        active: entity.active,
        waiting: entity.waiting,
        mute: entity.muted,
        deactive: entity.deactivated
    };
    return model;
};
mapper.toClassRoom = function (batches) {

    return batches.map(function (batch) {
        if (!batch) {
            return;
        }
        var model = {
            id: batch.id,
            subject: batch.subject,
            body: batch.body,
            status: batch.status,
            isPublic: batch.isPublic,
            isDefault: batch.isDefault,
            course: batch.course,
            membersCount: batch.members.length || 0
        };

        if (batch.owner) {
            if (batch.owner.user) {
                model.owner = {
                    id: batch.owner.id,
                    name: batch.owner.name
                };
            } else {
                model.owner = {
                    id: batch.owner.toString()
                };
            }
        }
        return model;
    });
};
mapper.toClassMembers = function (batch, type) {

    var members = [];
    if (_.isEmpty(batch.members)) {
        return members;
    }

    var filteredMembers = _.filter(batch.members, function (member) {
        if (member.profile) {
            return member.profile.type === type;
        }
    });

    var member = {};

    _.each(filteredMembers, function (item) {
        var member = {
            status: item.status,
            isModerator: item.isModerator,
            muted: item.muted,
            deactivated: item.deactivated,

        };
        if (item.profile && item.profile._doc) {
            member.profile = {
                id: item.profile.id,
                name: item.profile.name,
                rollNo: item.profile.rollNo,
                code: item.profile.code,
                status: item.profile.status,
                picUrl: item.profile.picUrl
            };
        }
        members.push(member);
    });

    return { members: members };
};

mapper.toClassStudents = function (profiles) {
    var members = [];

    if (_.isEmpty(profiles)) {
        return members;
    }
    var member = {};


    _.each(profiles, function (item) {
        _.each(item.defaultCommunity.members, function (student) {
            if (student.profile.toString() === item.id) {
                var member = {
                    status: student.status,
                    isModerator: student.isModerator,
                    muted: student.muted,
                    deactivated: student.deactivated
                };
                member.profile = {
                    id: item.id,
                    name: item.name,
                    rollNo: item.rollNo,
                    code: item.code,
                    status: item.status,
                    picUrl: item.picUrl,
                    type: item.type
                }
                members.push(member);
            }
        })
    })
    // var filteredMembers = _.filter(batch.members, function(member) {
    //     if (member.profile) {
    //         return member.profile.type === type;
    //     }
    // });


    // _.each(filteredMembers, function (item) {
    //     var member = {
    //         status: item.status,
    //         isModerator: item.isModerator,
    //         muted: item.muted,
    //         deactivated: item.deactivated,

    //     };
    //     if (item.profile && item.profile._doc) {
    //         member.profile = {
    //             id: item.profile.id,
    //             name: item.profile.name,
    //             rollNo: item.profile.rollNo,
    //             code: item.profile.code,
    //             status: item.profile.status,
    //             picUrl: item.profile.picUrl
    //         };
    //     }
    //     members.push(member);
    // });

    return { members: members };
};

mapper.waitingMembers = function (items) {
    var members = [];
    if (!_.isEmpty(items)) {
        _.each(items, function (community) {
            if (community.members) {
                _.each(community.members, function (member) {
                    if (member.status === "waiting") {
                        members.push({
                            community: community.subject,
                            prifile: {
                                id: member.profile.id,
                                name: member.profile.name,
                                rollNo: member.profile.rollNo,
                                batchNo: member.profile.batchNo,
                                course: member.profile.course,
                                employeeNo: member.profile.employeeNo,
                            },
                            status: member.status,
                            isModerator: member.isModerator,
                            muted: member.muted,
                            deactivated: member.deactivated
                        });
                    }
                });
            }
        });
    }
    return members;
};
mapper.activeMembers = function (items) {
    var members = [];
    if (!_.isEmpty(items)) {
        _.each(items, function (community) {
            if (community.members) {
                _.each(community.members, function (member) {
                    var isMonitor = false;
                    if (member.status === "active") {
                        if (member.isModerator === true && member.profile.batchNo === community.subject) {
                            isMonitor = true;
                        }
                        members.push({
                            community: community.subject,
                            prifile: {
                                id: member.profile.id,
                                name: member.profile.name,
                                rollNo: member.profile.rollNo,
                                batchNo: member.profile.batchNo,
                                course: member.profile.course,
                                employeeNo: member.profile.employeeNo,
                                isMonitor: isMonitor
                            },
                            status: member.status,
                            isModerator: member.isModerator,
                            muted: member.muted,
                            deactivated: member.deactivated
                        });
                    }
                });
            }
        });
    }
    return members;
};
mapper.mutedMembers = function (items) {
    var members = [];
    if (!_.isEmpty(items)) {
        _.each(items, function (community) {
            if (community.members) {
                _.each(community.members, function (member) {
                    if (member.muted === true) {
                        members.push({
                            community: community.subject,
                            prifile: {
                                id: member.profile.id,
                                name: member.profile.name,
                                rollNo: member.profile.rollNo,
                                batchNo: member.profile.batchNo,
                                course: member.profile.course,
                                employeeNo: member.profile.employeeNo,
                            },
                            status: member.status,
                            isModerator: member.isModerator,
                            muted: member.muted,
                            deactivated: member.deactivated
                        });
                    }
                });
            }
        });
    }
    return members;
};
mapper.deactivedMembers = function (items) {
    var members = [];
    if (!_.isEmpty(items)) {
        _.each(items, function (community) {
            if (community.members) {
                _.each(community.members, function (member) {
                    if (member.deactivated === true) {
                        members.push({
                            community: community.subject,
                            prifile: {
                                id: member.profile.id,
                                name: member.profile.name,
                                rollNo: member.profile.rollNo,
                                batchNo: member.profile.batchNo,
                                course: member.profile.course,
                                employeeNo: member.profile.employeeNo,
                            },
                            status: member.status,
                            isModerator: member.isModerator,
                            muted: member.muted,
                            deactivated: member.deactivated
                        });
                    }
                });
            }
        });
    }
    return members;
};

// mapper.toMembers = function(entities) {

//     return entities.map(function(entity) {
//         return {
//             id: entity.id,
//             picUrl: entity.picUrl,
//             picData: entity.picData,
//             name: entity.name,
//             rollNo: entity.rollNo,
//             isModerator: entity.isModerator,
//             status: entity.status,
//             phone: entity.user.phone,
//             code: entity.code
//         };
//     });
// };