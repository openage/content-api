'use strict';
var mongoose = require('mongoose');
var models = require('mongoose').models;
// var _ = require('underscore');
// var geolib = require('geolib');
// var moment = require('moment');
var mongoosePaginate = require('mongoose-paginate');

var activity = mongoose.Schema({
    subject: String,
    body: String,
    type: { type: String }, // post, event, task
    icon: { type: String, default: 'calendar' },
    owner: { type: mongoose.Schema.Types.ObjectId, ref: 'profile' },
    picUrl: String,
    picData: String,
    feedUrl: String,
    dueDate: Date,
    lastUpdate: {
        profile: { type: mongoose.Schema.Types.ObjectId, ref: 'profile' },
        content: String
    },
    attachments: [{
        picUrl: String,
        picData: String,
        mimeType: String,
        name: String
    }],
    isPublic: { type: Boolean, default: false },
    isDefault: { type: Boolean, default: false },

    status: String,

    community: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'community'
    },

    participants: [{
        status: String, // invited, participant, disliked
        date: Date,
        profile: { type: mongoose.Schema.Types.ObjectId, ref: 'profile' }
    }],

    location: {
        coordinates: {
            type: [Number], // [<longitude>, <latitude>]
            index: '2dsphere' // create the geospatial index
        },
        name: String,
        description: String,
    },
    created_At: { type: Date, default: Date.now },
    updated_At: { type: Date, default: Date.now }
});

activity.pre('save', function(next) {
    this.updated_At = Date.now();
    next();
});
activity.plugin(mongoosePaginate);
// activity.methods = {
//     isLike: function (currentProfile) {
//         var like = _.find(this.liked, function(item) {
//             return item == currentProfile;
//         });
//         this._doc.isLike = !!like;
//     },
//     isEditable: function (currentProfile) {
//         if(this.profile) {
//             if(this.profile.id == currentProfile)
//                 this._doc.isEditable = true;
//             else this._doc.isEditable = false;
//         }else this._doc.isEditable = false;

//     },
//     isMyComment: function (currentProfile) {
//         if(this.profile.id == currentProfile) {
//             this._doc.myComment = 'true';
//         } else this._doc.myComment = 'false';
//     }
// };

mongoose.model('activity', activity);