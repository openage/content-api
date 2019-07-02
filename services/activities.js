'use strict'

const db = require('../models')

const set = async (model, entity, context) => {
    if (model.subject) {
        entity.subject = model.subject
    }

    if (model.body) {
        entity.body = model.body
    }

    if (model.status) {
        entity.status = model.status
    }

    if (model.date) {
        entity.date = model.date
    }

    if (model.startTime) {
        entity.startTime = model.startTime
    }

    if (model.endTime) {
        entity.endTime = model.endTime
    }

    if (model.type) {
        entity.type = model.type
    }

    if (model.icon) {
        entity.icon = model.icon
    }

    if (model.feedUrl) {
        entity.feedUrl = model.feedUrl
    }

    if (model.dueDate) {
        entity.dueDate = model.dueDate
    }

    if (model.religion) {
        entity.religion = model.religion
    }

    if (model.isPublic !== undefined) {
        entity.isPublic = model.isPublic
    }

    if (model.pic) {
        entity.pic = entity.pic || {}
        if (model.pic.url) {
            entity.pic.url = model.pic.url
        }

        if (model.pic.thumbnail) {
            entity.pic.thumbnail = model.pic.thumbnail
        }
    }

    if (model.address) {
        entity.address = entity.address || {}

        if (model.address.line1) {
            entity.address.line1 = model.address.line1
        }

        if (model.address.line2) {
            entity.address.line2 = model.address.line2
        }

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
}

const create = async (model, context) => {
    let entity = await new db.activity({
        subject: model.subject,
        date: new Date(),
        status: model.status
    })

    set(model, entity, context)

    await entity.save()

    return entity
}

exports.create = create

const update = async (id, model, context) => {
    let entity = await getById(id, context)

    set(model, entity, context)

    await entity.save()

    return entity
}

exports.update = update
exports.search = async (query, page, context) => {
    let where = {}

    where.status = 'active'

    if (query.status) {
        where.status = query.status
    }

    if (query.isPublic) {
        let isPublic = query.isPublic == 'true' ? true : false;
        where.isPublic = isPublic;
    }

    let dbQuery = db.activity.find(where)

    let items = await (page ? dbQuery.skip(page.skip).limit(page.limit) : dbQuery)

    let count = await db.activity.find(where).count()

    return {
        items: items,
        count: count
    }
}

const getById = async (id, context) => {
    return db.activity.findById(id)
}

const get = async (query, context) => {

    if (typeof query === 'string') {
        if (query.isObjectId()) {
            return getById(query, context)
        }
    }
    if (query.id) {
        return getById(query.id, context)
    }

    return null
}

exports.get = get
