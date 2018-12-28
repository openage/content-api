'use strict';
var async = require('async');
var db = require('mongoose').models;
var mapper = require('../mappers/note');
var entitiesHelper = require('../helpers/entities');
var _ = require('underscore');

exports.create = function(req, res) {

    var recipientId = req.params.recipientId;
    var model = req.body;
    model.profile = req.user.profile;
    async.waterfall([
        function(cb) {
            new db.note(model)
                .save(function(err, note) {
                    if (err) {
                        return cb(err);
                    }
                    cb(null, note);
                });
        },
        function(note, cb) {

            var noteBlock = {
                note: note.id,
                profile: req.user.profile.id
            };

            db.profile.findOneAndUpdate({
                _id: recipientId
            }, {
                $addToSet: {
                    notes: noteBlock
                }
            }, function(err, recipient) {
                if (err) {
                    return cb(err);
                }
                cb(null, note, recipient);
            });
        }
    ], function(err, note, recipient) {
        if (err) {
            return res.failure(err);
        }
        res.data(mapper.toModel(note));

    });
};

//not test yet
exports.update = function(req, res) {
    var model = req.body;
    var noteId = req.params.id;

    async.waterfall([
        function(cb) {
            db.note.findOne({ _id: noteId })
                .populate('recipient')
                .exec(cb);
        },
        function(note, cb) {
            note = entitiesHelper(note).set(model, ['comment', 'attachment']);
            note.save(function(err, note) {
                if (err) {
                    return cb(err);
                }
                cb(null, note);
            });
        }
    ], function(err, note) {
        if (err) {
            return res.failure(err);
        }
        res.data(mapper.toModel(note));

    });
};

exports.delete = function(req, res) {

    var noteId = req.params.id;
    var recipientId = req.body.recipientId;

    async.waterfall([
            function(cb) {
                db.note.remove({
                    _id: noteId
                }, function(err) {
                    if (err) {
                        return cb(err);
                    }
                    cb(null);
                });
            },
            function(cb) {
                db.profile.findOne({
                    _id: recipientId
                }, function(err, recipient) {
                    if (err) {
                        return cb(err);
                    }
                    cb(null, recipient);
                });
            },
            function(recipient, cb) {
                var notes = _.filter(recipient.notes, function(item) {
                    if (item.note.toString() !== noteId) {
                        return item;
                    }
                });
                recipient.notes = notes;
                recipient.save(function(err, recipient) {
                    if (err) {
                        return cb(err);
                    }
                    cb(null, recipient);
                });
            }
        ],
        function(err, recipient) {
            if (err) {
                return res.failure(err);
            }
            res.success('note deleted');
            var note = {
                id: noteId
            };

        });
};

exports.getAll = function(req, res) {
    var recipientId = req.params.id;
    async.waterfall([
        function(cb) {
            db.profile.findOne({
                _id: recipientId
            }, cb);
        },
        function(recipient, cb) {
            var noteIds = _.pluck(recipient.notes, 'note');
            db.note.find({
                    _id: {
                        $in: noteIds
                    }
                }).populate('profile')
                .exec(cb);
        }
    ], function(err, notes) {
        if (err) {
            return res.failure(err);
        }
        res.page(mapper.toSearchModel(notes));
    });

};

exports.get = function(req, res) {
    var noteId = req.params.id;
    db.note.findOne({
            _id: noteId
        }).populate('profile')
        .exec(function(err, note) {
            if (err) {
                return res.failure(err);
            }
            res.data(mapper.toModel(note));
        });
};