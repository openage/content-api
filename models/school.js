'use strict';
var mongoose = require('mongoose');
let findOneOrCreate = require('mongoose-findorcreate');
var mongoosePaginate = require('mongoose-paginate');

var school = mongoose.Schema({
    code: { type: String, unique: true },
    picUrl: String,
    picData: String,
    name: String,
    about: String,
    status: { type: String, default: 'active' },
    hasCourses: Boolean, //true for college and false for school
    orgCode: String,
    logo: String, // Logo of organization
    location: {
        //  coordinates: {
        //   type: { type: String }, // [<longitude>, <latitude>]
        //index: [Number] // create the geospatial index
        //   },:
        coordinates: [],
        name: String,
        description: String,
    }

});
school.plugin(mongoosePaginate);
school.plugin(findOneOrCreate);

mongoose.model('school', school);