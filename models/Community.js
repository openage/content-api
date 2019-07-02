'use strict'

const mongoose = require('mongoose')

module.exports = {
    subject: String,
    body: String,
    picUrl: String,
    picData: String,
    status: { type: String, default: 'active' }, // active

    //Community of which organization
    organization: { type: mongoose.Schema.Types.ObjectId, ref: 'organization' },

    // isStaff: { type: Boolean, default: false }, //isStaffRoom or Not

    icon: { type: String, default: 'collection' },
    priority: Number, // order in which the the communities would be sorted
    isPublic: { type: Boolean, default: false }, // todo: change this type as isPublic

    isDefault: { type: Boolean, default: false },
    isPrivate: { type: Boolean, default: false },
    isArchive: { type: Boolean, default: false },

    isFollowable: { type: Boolean, default: false },
    followers: [{ type: mongoose.Schema.Types.ObjectId, ref: 'community' }],
    following: [{ type: mongoose.Schema.Types.ObjectId, ref: 'community' }],
    isSubscribed: [{ type: mongoose.Schema.Types.ObjectId, ref: 'organization' }],

    feedUrl: String,

    // canBeSubscribed: { type: Boolean, default: false }, TODo
    // subscriptions: [{
    //     community: { type: mongoose.Schema.Types.ObjectId, ref: 'community' }
    // }],

    location: {
        coordinates: {
            type: [Number], // [<longitude>, <latitude>]
            index: '2dsphere' // create the geospatial index
        },
        name: String,
        description: String,
    },

    owner: { type: mongoose.Schema.Types.ObjectId, ref: 'user' },

    members: [{
        isModerator: { type: Boolean, default: false },
        muted: { type: Boolean, default: false }, // TODO - remove me
        deactivated: { type: Boolean, default: false }, // TODO - remove me
        status: String, // waiting (only in default community), active, invited, blocked, muted
        date: Date,
        user: { type: mongoose.Schema.Types.ObjectId, ref: 'user' }
    }],

    interests: [{ type: mongoose.Schema.Types.ObjectId, ref: 'interest' }],

}
