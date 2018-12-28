'use strict';
var path = require('path');
var fs = require('fs');
var formidable = require('formidable');
var rootPath = path.normalize(__dirname + './../');
var fmsConfig = require('config').get('fms');
var request = require('request');

exports.withFileForm = function(req, callback) {
    var form = new formidable.IncomingForm();
    form.uploadDir = rootPath + 'temp';
    form.keepExtensions = true;
    form.parse(req, callback);
};

exports.dataUpload = function(data, callback) { // s3 bucket images
    var req = request.post({
        url: fmsConfig.url,
        headers: {
            'Content-Type': fmsConfig.contentType,
            'x-access-token': fmsConfig.xAccessToken,
            'user': fmsConfig.user
        }
    }, function optionalCallback(err, httpResponse, body) {
        if (err) {
            console.error('upload failed:', err);
            return callback('oops something went wrong');
        } else {
            if (httpResponse.statusCode !== 200) {
                return callback('oops something went wrong');
            }
            var data = JSON.parse(body);
            return callback(null, data);
        }
    });
    var form = req.form();
    form.append('file', fs.createReadStream(data.path));
};