'use strict'
var mongoose = require('mongoose')
var dbConfig = require('config').get('dbServer')

module.exports.configure = function (logger) {
    const log = logger.start('settings/database:configure')
    mongoose.Promise = global.Promise

    let connect = function () {
        log.info('connecting to', dbConfig)
        mongoose.connect(dbConfig.host)
    }

    connect()

    let db = mongoose.connection

    db.on('connected', function () {
        log.info('DB Connected')
    })

    db.on('error', function (err) {
        log.error('Mongoose default connection error: ' + err)
    })

    db.on('disconnected', function () {
        log.info('Again going to connect DB')
        connect()
    })

    global.db = require('../models')
    return global.db
}
