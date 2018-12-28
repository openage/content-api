'use strict';
var express = require('express');
var logger = require('./helpers/logger')('app');
var passport = require('passport');
var http = require('http');
var serverConfig = require('config').get('webServer');

require('./helpers/string');
//var chat = require('./middleware/chat');
//chat.init();

var app = express();

require('./settings/database').configure(app);
require('./settings/express').configure(app);
require('./settings/routes').configure(app);

var server = http.createServer(app);
var port = process.env.PORT || serverConfig.port || 3300;
logger.info('environment: ' + process.env.NODE_ENV);

logger.info('starting server');
server.listen(port, function() {
    logger.info('listening on port:' + port);
});


module.exports = app;