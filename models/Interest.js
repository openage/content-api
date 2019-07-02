'use strict';
const mongoose = require('mongoose');

module.exports = {
    name: {
        type: String,
        lowercase: true,
        default: ''
    },
    popularity: {
        type: Number,
        default: 0
    },
    // related: [{
    //     weigtage: Number,
    //     tag: { type: mongoose.Schema.Types.ObjectId, ref: 'tag' }
    // }],
    optional: {
        type: Number,
        default: 0
    }
}
