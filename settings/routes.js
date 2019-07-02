'use strict'
const auth = require('../helpers/auth')
const apiRoutes = require('@open-age/express-api')
const fs = require('fs')
const specs = require('../specs')

module.exports.configure = (app, logger) => {
    logger.start('settings:routes:configure')

    let specsHandler = function (req, res) {
        fs.readFile('./public/specs.html', function (err, data) {
            if (err) {
                res.writeHead(404)
                res.end()
                return
            }
            res.contentType('text/html')
            res.send(data)
        })
    }

    app.get('/', specsHandler)
    app.get('/specs', specsHandler)
    app.get('/swagger', specsHandler)

    app.get('/api', function (req, res) {
        res.contentType('application/json')
        res.send(specs.get())
    })

    app.get('/api/specs', function (req, res) {
        res.contentType('application/json')
        res.send(specs.get())
    })

    app.get('/about', function (req, res) {
        res.contentType('application/json')
        res.send(specs.get().info)
    })

    var api = apiRoutes(app)

    api.model('users').register('REST', [auth.requireRoleKey])
    api.model('activities').register('REST', [auth.requireRoleKey])
    api.model('interests').register('REST', [auth.requireRoleKey])

}
