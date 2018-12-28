'use strict';
var async = require('async');
var _ = require('underscore');
var db = require('mongoose').models;
var mapper = require('../mappers');
var entitiesHelper = require('../helpers/entities');

exports.get = function(req, res) {
    db.course.findById(req.params.id)
        .populate({
            path: 'batches.batch',
            model: 'community',
            populate: {
                path: 'members.profile owner',
                model: 'profile'
            }
        })
        .exec(function(err, batch) {
            if (err) {
                return res.failure(err);
            }
            res.page(mapper.batch.toBatchModel(batch));
        });
};

exports.update = function(req, res) { //for admin ui 

    if (req.profile.type !== "admin") {
        return res.failure('access denied');
    }

    var model = req.body;

    let batchId = req.params.batchId;
    let toUpdate = {};
    let batchToUpdate = {};

    if (model.subject) {
        batchToUpdate['batches.$.name'] = model.subject;
        toUpdate.subject = model.subject;

    }
    if (model.status) {
        batchToUpdate['batches.$.status'] = model.status;
        toUpdate.status = model.status;
    }

    async.waterfall([
        function(cb) {

            db.community.update({
                _id: batchId
            }, {
                $set: toUpdate
            }, function(err) {
                cb(err);
            });
        },
        function(cb) {
            var query = {};
            query['batches.batch'] = batchId;
            db.course.update(query, {
                $set: batchToUpdate
            }, function(err) {
                cb(err);
            });
        }
    ], function(err) {
        if (err) {
            return res.failure(err);
        }
        res.success('batch updated');
    });
};