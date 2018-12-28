'use strict';

var mongoose = require('mongoose');

var note = mongoose.Schema({

    comment: String,
    attachment: String,
    created_At: { type: Date, default: Date.now },
    updated_At: { type: Date, default: Date.now },
    profile: { type: mongoose.Schema.Types.ObjectId, ref: 'profile' }
});

note.pre('save', function(next) {
    this.updated_At = Date.now();
    next();
});

mongoose.model('note', note);