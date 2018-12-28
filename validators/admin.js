'use strict';
var db = require('mongoose').models;
var uploader = require('../helpers/fileUpload');


// exports.canSearch = function(req, cb) {
//     if (req.school.orgCode) {
//         db.school.find({
//             orgCode: req.school.orgCode,
//         }).exec(function(err, schools) {
//             if (err || schools) {
//                 req.sharedSchools = schools;
//                 return cb(null);
//             } else {
//                 return cb(null);
//             }
//         });
//     } else {
//         return cb(null);
//     }

// };

exports.canCreate = function(req, callback) {
    uploader.withFileForm(req, function(err, field, files) {
        if (err) {
            return callback(err);
        }
        if (files.length === 0) {
            return callback('file not found');
        }
        uploader.dataUpload(files.file, function(err, data) {
            if (err) {
                return callback(err);
            }
            req.query.fileUrl = data.data.url;
            return callback(null);
        });
    });
};