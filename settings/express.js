'use strict';
var express = require('express');
var path = require('path');
var favicon = require('serve-favicon');
var flash = require('connect-flash');
var uuid = require('uuid');

var logger = require("../helpers/logger")('config.express');
var cookieParser = require('cookie-parser');
var bodyParser = require('body-parser');
var session = require('express-session');
var appRoot = require('app-root-path');

module.exports.configure = function(app) {
    var log = logger.start('config');
    app.use(function(err, req, res, next) {
        if (err) {
            (res.log || log).error(err.stack);
            if (req.xhr) {
                res.send(500, { error: 'Something blew up!' });
            } else {
                next(err);
            }

            return;
        }
        next();
    });

    app.use(require('morgan')({ "stream": logger.stream }));
    app.use(bodyParser.json());
    app.use(cookieParser());
    app.use(bodyParser.urlencoded({
        extended: true
    }));

    var root = path.normalize(__dirname + './../');
    app.set('views', path.join(root, 'views'));
    app.set('view engine', 'ejs');
    app.use(express.static(path.join(root, 'public')));
    app.use(flash());

};