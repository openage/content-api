'use strict';
var withFileForm = require('../helpers/fileUpload').withFileForm;
var csvExtractor = require('../services/csvExtractor');
var async = require('async');

exports.canCsvImport = function(req, callback) {
    withFileForm(req, function(err, fields, files) {
        var row = 2;
        if (err) {
            return callback(err);
        }
        if (files.length === 0) {
            return callback('file not found');
        }
        if (!files.record) {
            return callback('file not found');
        }

        csvExtractor.extract(files, function(err, data) {
            if (err) {
                return callback(err);
            }
            if (data.length === 0) {
                return callback('unable to parse data from file');
            }
            async.eachSeries(data, function(item, next) {
                row++;
                next();
            }, function(err) {
                if (err) {
                    return err;
                }
                req.data = data;
                return callback(null);
            });
        });
    });
};