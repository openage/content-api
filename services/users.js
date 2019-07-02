'use strict'

const db = require('../models')
const organizationService = require('./organizations')

// eslint-disable-next-line no-undef

const directory = require('@open-age/directory-client')

const set = (model, entity, context) => {
    if (model.phone) {
        entity.phone = model.phone
    }

    if (model.email) {
        entity.email = model.email
    }

    if (model.status) {
        entity.status = model.status
    }

    if (model.profile) {
        entity.profile = entity.profile || {}

        if (model.profile.firstName) {
            entity.profile.firstName = model.profile.firstName
        }

        if (model.profile.lastName) {
            entity.profile.lastName = model.profile.lastName
        }

        if (model.profile.dob) {
            entity.profile.dob = model.profile.dob
        }

        if (model.profile.gender) {
            entity.profile.gender = model.profile.gender
        }

        if (model.profile.pic) {
            if (model.profile.pic.url) {
                entity.profile.pic.url = model.profile.pic.url
            }

            if (model.profile.pic.thumbnail) {
                entity.profile.pic.url = model.profile.pic.thumbnail
            }
        }
    }

    return entity
}

exports.get = async (query, context) => {
    context.logger.debug('services/users:get')
    if (!query) {
        return null
    }

    if (typeof query === 'string') {
        if (query.isObjectId()) {
            return db.user.findOne({
                where: {
                    id: query.toObjectId()
                }
            })
        } else {
            return db.user.findOne({
                where: {
                    code: query
                }
            })
        }
    }

    if (query.id) {
        return db.user.findOne({
            where: {
                id: query.id
            }
        })
    }

    if (query.code) {
        return db.user.findOne({
            where: {
                code: query.code
            }
        })
    }

    return null
}

exports.create = async (model, context) => {
    const log = context.logger.start('services/users:create')

    var entity = new db.user(model)

    set(model, entity, context)

    return entity.save()
}

exports.update = async (id, model, context) => {
    const log = context.logger.start('services/users:update')

    let entity = await db.user.findById(id)
    set(model, entity, context)
    return entity.save()
}

exports.search = async (query, page, context) => {
    const log = context.logger.start('services/users:search')

    let where = {}

    if (query.name) {
        where.name = {
            [Op.like]: `%${query.name}%`
        }
    }
    const items = await db.user.findAll({ where: where })

    return {
        items: items,
        count: items.length
    }
}

exports.getFromDirectory = async (key, logger) => {
    let log = logger.start('services/users:getFromDirectory')

    let user = await db.user.findOne({
        'role.key': key
    })

    if (user) { return user }

    let role = await directory.getRole(key)

    if (!role) {
        throw new Error('role not found')
    }

    let organization = null
    if (role.organization) {
        organization = await organizationService.getOrCreate(role.organization, { logger: logger })
    }

    user = await db.user.findOne({
        'role.id': role.id
    })

    if (!user) {
        user = new db.user({
            role: {
                id: role.id,
                key: role.key,
                code: role.code
            },
            organization: organization
        })
    }

    if (role.user) {
        set(role.user, user, { logger: logger })
    }

    log.end()
    return user.save()
}
