'use strict';
var mongoose = require('mongoose');

module.exports = {

    role: {
        id: { type: String, unique: true },
        code: String,
        key: String,
        permissions: []
    },

    phone: String,
    email: String,
    status: String,

    profile: {
        firstName: String,
        lastName: String,
        dob: Date,
        gender: String,
        pic: {
            url: String,
            thumbnail: String
        }
    },

    address: {
        line1: String,
        line2: String,
        district: String,
        city: String,
        state: String,
        pinCode: String,
        country: String
    },

    isPublic: { type: Boolean, default: false },
    about: String,

    organization: { type: mongoose.Schema.Types.ObjectId, ref: 'organization' },

    location: {
        coordinates: {
            type: [Number], // [<longitude>, <latitude>]
            index: '2dsphere' // create the geospatial index
        },
        name: String,
        description: String,
    },

    // spread the word
    contactFriends: [String],

    communities: [{
        status: String, // active, invited, blocked, muted
        date: Date,
        community: { type: mongoose.Schema.Types.ObjectId, ref: 'community' }
    }],

    interests: [{ type: mongoose.Schema.Types.ObjectId, ref: 'interest' }],
    defaultCommunity: { type: mongoose.Schema.Types.ObjectId, ref: 'community' },
    isSubscribed: [{ type: mongoose.Schema.Types.ObjectId, ref: 'organization' }]

}
