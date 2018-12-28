'use strict';
var mongoose = require('mongoose');
let findOneOrCreate = require('mongoose-findorcreate');


var community = mongoose.Schema({
    subject: String,
    body: String,
    picUrl: String,
    picData: String,
    status: { type: String, default: 'active' }, // active

    //Community of which school
    school: { type: mongoose.Schema.Types.ObjectId, ref: 'school' },

    // isStaff: { type: Boolean, default: false }, //isStaffRoom or Not

    icon: { type: String, default: 'collection' },
    priority: Number, // order in which the the communities would be sorted
    isPublic: { type: Boolean, default: false }, // todo: change this type as isPublic
    isDefault: { type: Boolean, default: false },
    isPrivate: { type: Boolean, default: false },
    isArchive: { type: Boolean, default: false },
    isFollowable: { type: Boolean, default: false },
    followers: [{ type: mongoose.Schema.Types.ObjectId, ref: 'community' }],
    following: [{type: mongoose.Schema.Types.ObjectId, ref: 'community'}],
    isSubscribed: [{ type: mongoose.Schema.Types.ObjectId, ref: 'school' }],
    feedUrl: String,
    // canBeSubscribed: { type: Boolean, default: false }, TODo
    // subscriptions: [{
    //     community: { type: mongoose.Schema.Types.ObjectId, ref: 'community' }
    // }],
    course: { type: mongoose.Schema.Types.ObjectId, ref: 'course' },
    chat: {
        id: Number // group dialog id
    },
    location: {
        coordinates: {
            type: [Number], // [<longitude>, <latitude>]
            index: '2dsphere' // create the geospatial index
        },
        name: String,
        description: String,
    },
    owner: { type: mongoose.Schema.Types.ObjectId, ref: 'profile' },

    members: [{
        isModerator: { type: Boolean, default: false },
        muted: { type: Boolean, default: false }, // TODO - remove me
        deactivated: { type: Boolean, default: false }, // TODO - remove me
        status: String, // waiting (only in default community), active, invited, blocked, muted
        date: Date,
        profile: { type: mongoose.Schema.Types.ObjectId, ref: 'profile' }
    }],


    activities: [{ type: mongoose.Schema.Types.ObjectId, ref: 'activity' }],
    interests: [{ type: mongoose.Schema.Types.ObjectId, ref: 'interest' }],
    tags: [{ type: mongoose.Schema.Types.ObjectId, ref: 'tag' }],

    resources: [{
        subject: String,
        url: String,
        profile: { type: mongoose.Schema.Types.ObjectId, ref: 'profile' }
    }],

    created_At: { type: Date, default: Date.now },
    updated_At: { type: Date, default: Date.now }
});

community.plugin(findOneOrCreate);

community.pre('save', function(next) {
    this.updated_At = Date.now();
    next();
});

// Community.methods = {
//     Get: function(lastSyncTime) {
//         return (profiles)
//     },
//     isConnection: function(currentProfile) {
//         var friend = _.find(this.connections, function(item) {
//             return item == currentProfile;
//         });
//         this._doc.friend = !!friend;
//     },
//     isFollower: function(currentProfile) {
//         var likedProfile = _.find(this.incomingRequests, function(item) {
//             return item == currentProfile;
//         });
//         this._doc.follower = !!likedProfile;
//     },
//     isFollowing: function(currentProfile) {
//         var Profile = _.find(this.outgoingRequests, function(item) {
//             return item == currentProfile;
//         });
//         this._doc.following = !!Profile;
//     },
//     isContactFriend: function(currentProfile) {
//         var Profile = _.find(this.contactFriend, function(item) {
//             return item == currentProfile;
//         });
//         this._doc.contactFriend = !!Profile;
//     },
//     isFbFriend: function(currentProfile) {
//         var Profile = _.find(this.facebookFriend, function(item) {
//             return item == currentProfile;
//         });
//         this._doc.fbFriend = !!Profile;
//     },
//     isKnock: function(currentProfile) {
//         var Profile = _.find(this.knockFrom, function(item) {
//             return item == currentProfile;
//         });
//         this._doc.isKnock = !!Profile;
//     },
//     isComplete: function() {
//         this._doc.isComplete = this.name != '';
//     }
// };

mongoose.model('community', community);