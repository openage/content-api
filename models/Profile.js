'use strict';
var mongoose = require('mongoose');
// var _ = require('underscore');
// var geolib = require('geolib');
// var moment = require('moment');
var mongoosePaginate = require('mongoose-paginate');

var profile = mongoose.Schema({
    picUrl: String,
    picData: String,
    name: String,
    age: Number,
    dateOfBirth: Date,
    gender: String,
    isPublic: { type: Boolean, default: false },
    about: String,
    type: { type: String, lowercase: true }, //admin, employee, student
    code: String,
    rollNo: String,
    status: String, //waiting -> active ,waiting -> rejected, rejected->waiting TODO
    desigination: String,
    school: {
        code: String,
        id: { type: mongoose.Schema.Types.ObjectId, ref: 'school' }
    },
    chat: {
        id: Number
    },
    location: {
        coordinates: {
            type: [Number], // [<longitude>, <latitude>]
            index: '2dsphere' // create the geospatial index
        },
        name: String,
        description: String,
    },
    images: [{
        order: Number,
        url: String
    }],
    tags: [{ type: mongoose.Schema.Types.ObjectId, ref: 'tag' }],
    interests: [{ type: mongoose.Schema.Types.ObjectId, ref: 'interest' }],
    defaultCommunity: { type: mongoose.Schema.Types.ObjectId, ref: 'community' },
    isSubscribed: [{ type: mongoose.Schema.Types.ObjectId, ref: 'school' }],
    communities: [{
        status: String, // active, invited, blocked, muted
        date: Date,
        community: { type: mongoose.Schema.Types.ObjectId, ref: 'community' }
    }],
    activities: [{
        status: String, // participant, invited, muted, admin
        date: Date,
        activity: { type: mongoose.Schema.Types.ObjectId, ref: 'activity' }
    }],
    connections: [{
        profile: { type: mongoose.Schema.Types.ObjectId, ref: 'profile' },
        status: String, //active, blocked, inComming, outGoing, ignored
        date: Date,
        school: { type: mongoose.Schema.Types.ObjectId, ref: 'school' }
    }],
    notifications: [{
        date: Date,
        subject: String,
        message: String,
        data: {
            id: String,
            entity: {
                id: String,
                type: { type: String },
                picUrl: String
            },
            api: String,
            action: String
        }
    }],
    notes: [{
        note: { type: mongoose.Schema.Types.ObjectId, ref: 'note' },
        profile: { type: mongoose.Schema.Types.ObjectId, ref: 'profile' }
    }],

    // spread the word
    facebookFriends: [String],
    contactFriends: [String],
    invitedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'profile' },

    user: { type: mongoose.Schema.Types.ObjectId, ref: 'user' },
    lastSeen: { type: Date, default: Date.now },

    created_At: { type: Date, default: Date.now },
    updated_At: { type: Date, default: Date.now }
});

profile.pre('save', function(next) {
    this.updated_At = Date.now();
    next();
});

profile.plugin(mongoosePaginate);

mongoose.model('profile', profile);