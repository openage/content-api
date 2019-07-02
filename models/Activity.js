'use strict'
var mongoose = require('mongoose')

module.exports = {
    subject: String,
    body: String,
    status: String,

    date: Date,
    startTime: Date,
    endTime: Date,

    type: { type: String }, // post, event, task

    icon: { type: String, default: 'calendar' },

    religion: String,

    pic: {
        url: String,
        thumbnail: String
    },

    feedUrl: String,
    dueDate: Date,

    lastUpdate: {
        user: { type: mongoose.Schema.Types.ObjectId, ref: 'user' },
        content: String
    },

    isPublic: { type: Boolean, default: false },
    isDefault: { type: Boolean, default: false },

    owner: { type: mongoose.Schema.Types.ObjectId, ref: 'user' },

    community: { type: mongoose.Schema.Types.ObjectId, ref: 'community' },

    interest: { type: mongoose.Schema.Types.ObjectId, ref: 'interest' },

    participants: [{
        status: String, // invited, participant, disliked
        date: Date,
        user: { type: mongoose.Schema.Types.ObjectId, ref: 'user' }
    }],

    location: {
        coordinates: {
            type: [Number], // [<longitude>, <latitude>]
            index: '2dsphere' // create the geospatial index
        },
        name: String,
        description: String,
    },

    address: {
        line1: String,
        line2: String,
        district: String,
        city: String,
        state: String,
        pinCode: String,
        country: String
    }
}
