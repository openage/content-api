'use strict'

global.Promise = require('bluebird')
process.env.APP = 'api'

const http = require('http')
const express = require('express')
const logger = require('@open-age/logger')('bin/api').start('booting')
var serverConfig = require('config').get('webServer')
var app = express()

require('../helpers/string')

require('../settings/database').configure(logger)
require('../settings/express').configure(app, logger)
require('../settings/routes').configure(app, logger)

var server = http.createServer(app)
var port = process.env.PORT || serverConfig.port
logger.info('environment: ' + process.env.NODE_ENV)

logger.info('starting server ...')
server.listen(port, () => {
    logger.info('listening on port:' + port)
})

module.exports = app
