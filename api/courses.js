'use strict';
var async = require('async');
var _ = require('underscore');
var db = require('mongoose').models;
var mapper = require('../mappers/course');
var entitiesHelper = require('../helpers/entities');

var batchDetails = function (batches, callback) {
    var batchList = [];

    db.community.find({
        _id: {
            $in: batches
        }
    }, function (err, communities) {
        if (err) {
            return callback(err);
        }

        _.each(communities, function (item) {
            batchList.push({
                name: item.subject,
                status: item.status,
                batch: item.id
            });
        });
        callback(null, batchList);
    });

};
// POST course
exports.create = function (req, res) {

    var schoolCode = req.headers['school-code'];
    var model = {
        name: req.body.name
        // status: req.body.status
    };

    if (req.body.batches) {
        model.batches = [];
        batchDetails(req.body.batches, function (err, batchList) {
            model.batches = batchList;
        });
    }

    async.waterfall([
         function (cb) {
            db.school.findOne({
                code: schoolCode
            }).exec(function (err, item) {
                if (err) {
                    return cb(err);
                }
                model.school = item.id;
                cb(null, item);
            });
        },
        function (school, cb) {
            db.course.findOne({
                name: { $regex: model.name, $options: 'i' },
                school: school.id
            }).exec(function (err, item) {
                if (err || item) {
                    return cb(err || 'course with name: ' + model.name + ' already exist.');
                }
                cb(null);
            });
        },
        function (cb) {
            var course = new db.course(model);
            course.save(function (err, savedCourse) {
                cb(err, savedCourse);
            });
        }

    ], function (err, course) {
        if (err) {
            return res.failure(err);
        }
        res.data(mapper.toModel(course));
    });
};

exports.get = function (req, res) {
    db.course.findOne({
        name: req.params.id
    })
        .populate('courses')
        .exec(function (err, course) {
            if (err) {
                return res.failure(err);
            }
            res.data(mapper.toCourseModel(course));
        });
};

exports.getById = function (req, res) {
    db.course.findOne({
        _id: req.params.id
    })
        .populate('courses')
        .exec(function (err, course) {
            if (err) {
                return res.failure(err);
            }  if(req.query.isArchive === 'true'){
                query.isArchive = true;
            }
            if(req.query.isArchive === 'false'){
                query.isArchive = false;
            }
            res.data(mapper.toModel(course));
        });
};
exports.search = function (req, res) {
    var query = {};
    var schoolCode = req.headers['school-code'];

    async.waterfall([
        function (cb) {
            db.school.findOne({
                code: schoolCode
            }).exec(function (err, school) {
                if (err) {
                    return cb(err);
                }
                query.school = school.id;
                cb(null, school);
            })
        },
        function (school, cb) {
            db.course.find(query)                
                .exec(function (err, items) {
                    if (err) {
                        return cb(err);
                    }                    
                    return cb(null, items);
                });

        }
    ], function (err, result) {
        if (err) {
            return res.failure(err);
        }
        res.page(mapper.toCourseModel(result));
    })

};
exports.update = function (req, res) {
    var model = req.body;

    async.waterfall([
        function (cb) {
            db.course.findById(req.params.id).exec(cb);
        },
        function (course, cb) {
            if (!course) {
                return cb('no records found');
            }
            if (model.name) {
                course.name = model.name;
            }
            if (model.status) {
                course.status = model.status;
            }
            return cb(null, course);
        },
        function (course, cb) {
            if (!_.isEmpty(model.batches)) {
                batchDetails(req.body.batches, function (err, batchList) {
                    if (err) {
                        return cb(err);
                    }
                    course.batches = batchList;
                    cb(null, course);
                });
            } else {
                cb(null, course);
            }
        },
        function (course, cb) {
            course.save(function (err) {
                if (err) {
                    return cb(err);
                }
                cb(null, course);

            });
        }
    ], function (err, course) {
        if (err) {
            return res.failure(err);
        }
        res.data(mapper.toModel(course));

    });
};