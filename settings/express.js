'use strict'
var express = require('express')
var path = require('path')
const cors = require('cors')

var bodyParser = require('body-parser')
var appRoot = require('app-root-path')

module.exports.configure = function (app, logger) {
    logger.start('settings/express:configure')
    app.use(cors())
    app.use((err, req, res, next) => {
        if (err) {
            res.writeHead(500)
            res.end()
            return
        }
        res.header('Access-Control-Allow-Origin', '*')
        res.header('Access-Control-Allow-Methods', 'POST, GET, OPTIONS, PUT, DELETE')
        res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization')
        next()
    })

    app.use(bodyParser.json())

    app.use(bodyParser.urlencoded({
        extended: true
    }))

    app.use(express.static(path.join(appRoot.path, 'public')))
    app.set('view engine', 'ejs')
    app.use(bodyParser({ limit: '50mb', keepExtensions: true }))

};
