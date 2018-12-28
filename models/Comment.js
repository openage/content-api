'use strict';
var mongoose = require('mongoose');

var comment = mongoose.Schema({
    text: String,
    profile: { type: mongoose.Schema.Types.ObjectId, ref: 'profile' },
    activity: { type: mongoose.Schema.Types.ObjectId, ref: 'activity' },
    community: { type: mongoose.Schema.Types.ObjectId, ref: 'community' },
    created_At: { type: Date, default: Date.now },
    updated_At: { type: Date, default: Date.now }
});

// Comment.methods = {
//     isMyComment: function (currentProfile) {
//         if(this.profile.id == currentProfile) {
//             this._doc.myComment = 'true';
//         } else this._doc.myComment = 'false';
//     }
// };

comment.pre('save', function(next) {
    this.updated_At = Date.now();
    next();
});

mongoose.model('comment', comment);