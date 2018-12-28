'use strict';
var async = require('async');
var _ = require('underscore');
var db = require('mongoose').models;
var mapper = require('../mappers/school');
var entitiesHelper = require('../helpers/entities');

// POST school
exports.create = function(req, res) {
    var data = req.body;
    var model = {
        hasCourses: data.hasCourses || false,
        code: data.code,
        picUrl: data.picUrl,
        picData: data.picData,
        name: data.name,
        about: data.about,
        orgCode: data.orgCode
    };

    if (data.location) {
        model.location = {
            name: data.location.name,
            description: data.location.description,
            coordinates: data.location.coordinates
        };
    }


    async.waterfall([
        function(cb) {
            db.school.findOne({
                code: model.code,
            }).exec(function(err, item) {
                if (err || item) {
                    return cb(err || 'school with code: ' + model.code + ' already exist.');
                }
                cb(null, item);
            });
        },
        function(item, cb) {
            var school = new db.school(model);
            school.save(function(err) {
                cb(err, school);
            });
        },

    ], function(err, school) {
        if (err) {
            return res.failure(err);
        }
        res.data(mapper.toModel(school));
    });
};
// DELETE school/{id}
exports.delete = function(req, res) {
    var model = req.body;
    async.waterfall([
        function(cb) {
            db.school.findOne({
                name: req.params.id
            }, cb);
        },
        function(school, cb) {
            school.status = 'deleted';
            school.save(function(err) {
                cb(err, school);
            });
        }
    ], function(err, school) {
        if (err) {
            return res.failure(err);
        }
        return res.success();
    });
};
// PUT school/{id}
exports.update = function(req, res) {
    var location = {
        coordinates: []
    };

    var model = req.body;
    if (model.locationName) {
        location.name = model.locationName;
    }
    if (model.longitude) {
        location.coordinates[1] = model.longitude;
    }
    if (model.latitude) {
        location.coordinates[0] = model.latitude;
    }

    async.waterfall([
        function(cb) {
            db.school.findOne({
                code: req.params.id,
            }, cb);
        },
        function(school, cb) {
            if (!school) {
                return cb('no records found');
            }

            school = entitiesHelper(school)
                .set(model, ['picUrl', 'picData', 'name', 'about', 'status', 'orgCode', 'logo']);
            school.location = location;
            school.save(function(err) {
                return cb(err);
            });
        },
        function(cb) {
            db.school.findOne({
                    code: req.params.id
                })
                .populate('interests tags members.profile admin')
                .exec(cb);
        }
    ], function(err, school) {
        if (err) {
            return res.failure(err);
        }
        res.data(mapper.toModel(school));

    });
};
// PUT school/{id}
exports.get = function(req, res) {
    db.school.findOne({
            code: req.params.id
        })
        .populate('interests tags members.profile admin')
        .exec(function(err, school) {
            if (err) {
                return res.failure(err);
            }
            return res.data(mapper.toModel(school));
        });
};
exports.search = function(req, res) {
    db.school.find({}, function(err, item) {
        return res.page(item);

    });
    // .populate('interests tags members.profile admin')
    // .exec(function (err, school) {
    //     if (err) {
    //         return res.failure(err);
    //     }
    //     return res.data(mapper.toModel(school));
    // });
};
