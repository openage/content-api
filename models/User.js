'use strict';
var mongoose = require('mongoose');
let findOneOrCreate = require('mongoose-findorcreate');

var user = mongoose.Schema({
    phone: String,
    facebookId: String,
    googleId: String,
    token: String,
    pin: String,
    password: String,
    chat: {
        id: Number,
        password: String
    },
    device: {
        id: String,
    },
    status: String,
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now },
    profile: { type: mongoose.Schema.Types.ObjectId, ref: 'profile' }
});
user.plugin(findOneOrCreate);

mongoose.model('user', user);