'use strict'


const getById = async (id, context) => {
    return db.interest.findById(id)
}

exports.getById = getById
