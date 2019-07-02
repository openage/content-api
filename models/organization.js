'use strict';

module.exports = {
    code: String,
    name: String,
    shortName: String,

    status: String,
    about: String,

    address: {
        line1: String,
        line2: String,
        district: String,
        city: String,
        state: String,
        pinCode: String,
        country: String
    },

    logo: String, // Logo of organization
    location: {
        //  coordinates: {
        //   type: { type: String }, // [<longitude>, <latitude>]
        //index: [Number] // create the geospatial index
        //   },
        coordinates: [],
        name: String,
        description: String,
    }
}
