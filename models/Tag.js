var mongoose = require('mongoose');

var tag = mongoose.Schema({
    name: String
});

mongoose.model('tag', tag);