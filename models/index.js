'use strict'
const fs = require('fs')
const mongoose = require('mongoose')
var changeCase = require('change-case')
// const findOrCreate = require('findorcreate-promise')

var init = function () {
    // set all the models on db
    // mongoose.plugin(findOrCreate)

    fs.readdirSync(__dirname).forEach(function (file) {
        if (file.indexOf('.js') && file.indexOf('index.js') < 0) {
            let name = file.split('.')[0]
            let entity = require('./' + file)
            entity.timeStamp = {
                type: Date,
                default: Date.now
            }

            let schema = mongoose.Schema(entity)
            schema.pre('save', function (next) {
                this.timeStamp = Date.now()
                next()
            })

            mongoose.model(changeCase.camelCase(name), schema)
        }
    })
}

init()

module.exports = mongoose.models
