'use strict';
var mongoose = require('mongoose');
// var _ = require('underscore');
// var geolib = require('geolib');
// var moment = require('moment');
var mongoosePaginate = require('mongoose-paginate');
let findOneOrCreate = require('mongoose-findorcreate');

var course = mongoose.Schema({
    name: String,
    status: { type: String, default: 'active' },
    isArchive: { type: Boolean, default: false },
    school: { type: mongoose.Schema.Types.ObjectId, ref: 'school' },
    batches: [{
        name: String,
        status: String,
        batch: { type: mongoose.Schema.Types.ObjectId, ref: 'community' }
    }]

});
course.plugin(mongoosePaginate);
course.plugin(findOneOrCreate);

mongoose.model('course', course);