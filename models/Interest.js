'use strict';
var mongoose = require('mongoose');

var interest = mongoose.Schema({
    name: { type: String, lowercase: true, default: '' },
    popularity: { type: Number, default: 0 },
    tag: { type: mongoose.Schema.Types.ObjectId, ref: 'tag' },
    // related: [{
    //     weigtage: Number,
    //     tag: { type: mongoose.Schema.Types.ObjectId, ref: 'tag' }
    // }],
    optional: { type: Number, default: 0 }
});

interest.plugin(require('mongoose-find-one-or-create'));

mongoose.model('interest', interest);