'use strict'

const db = require('../models')

const set = (model, entity, context) => {
    if (model.name) {
        entity.name = model.name
    }

    if (model.shortName) {
        entity.shortName = model.shortName
    }

    if (model.about) {
        entity.about = model.about
    }

    if (model.address) {
        entity.address = entity.address || {}

        if (model.address.line1) {
            entity.address.line1 = model.address.line1
        }

        if (model.address.line2) (
            entity.address.line2 = model.address.line2
        )

        if (model.address.district) {
            entity.address.district = model.address.district
        }

        if (model.address.city) {
            entity.address.city = model.address.city
        }

        if (model.address.state) {
            entity.address.state = model.address.state
        }

        if (model.address.pinCode) {
            entity.address.pinCode = model.address.pinCode
        }

        if (model.address.country) {
            entity.address.country = model.address.country
        }
    }

    if (model.location) {
        entity.location = model.location
    }

    if (model.logo) {
        entity.logo = model.logo
    }
}

const create = async (model, context) => {
    let entity = await new db.organization({
        code: model.code
    }).save()

    set(model, entity, context)

    await entity.save()

    return entity
}

exports.create = create

const get = async (query, context) => {

    if (typeof query === 'string') {
        if (query.isObjectId()) {
            return getById(query, context)
        } else {
            return getByCode(query, context)
        }
    }
    if (query.id) {
        return getById(query.id, context)
    }

    if (query.code) {
        return getByCode(query.code, context)
    }
    return null


}

exports.get = get

const getById = async (id, context) => {
    return db.organization.findById(id)
}

const getByCode = async (code, context) => {
    return db.organization.findOne({
        code: code
    })
}

const getOrCreate = async (data, context) => {
    let entity = await get(data, context)

    if (!entity) {
        entity = await create(data, context)
    }

    return entity
}

exports.getOrCreate = getOrCreate

