'use strict'
const contextBuilder = require('./context-builder')
const users = require('../services/users')

const fetch = (req, modelName, paramName) => {
    var value = req.query[`${modelName}-${paramName}`] || req.headers[`x-${modelName}-${paramName}`]
    if (!value && req.body[modelName]) {
        value = req.body[modelName][paramName]
    }
    if (!value) {
        return null
    }

    var model = {}
    model[paramName] = value
    return model
}

const extractFromRoleKey = async (roleKey, logger) => {
    let log = logger.start('extractRoleKey')

    let user = await users.getFromDirectory(roleKey, log)

    if (!user) {
        throw new Error('invalid role key')
    }

    user.recentLogin = Date.now()
    await user.save()

    log.end()
    return user
}

exports.requireRoleKey = (req, res, next) => {
    let log = res.logger.start('helpers/auth:requireRoleKey')
    var role = fetch(req, 'role', 'key')

    if (!role) {
        return res.accessDenied('ROLE_KEY_MISSING')
    }

    extractFromRoleKey(role.key, log).then(user => {
        contextBuilder.create({
            user: user,
            role: user.role,
            organization: user.organization
        }, res.logger).then(context => {
            req.context = context
            next()
        })
    }).catch(err => {
        res.failure('invalid credentials')
    })
}
