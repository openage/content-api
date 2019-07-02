'use strict'
String.prototype.toObjectId = function () {
    let ObjectId = (require('mongoose').Types.ObjectId)
    return new ObjectId(this.toString())
}

String.prototype.isObjectId = function () {
    let ObjectId = (require('mongoose').Types.ObjectId)
    return ObjectId.isValid(this.toString())
}

String.prototype.inject = function (data) {
    let template = this

    function getValue (obj, is, value) {
        if (typeof is === 'string') {
            is = is.split('.')
        }
        if (is.length === 1 && value !== undefined) {
            return obj[is[0]] = value
        } else if (is.length === 0) {
            return obj
        } else {
            let prop = is.shift()
            // Forge a path of nested objects if there is a value to set
            if (value !== undefined && obj[prop] === undefined) { obj[prop] = {} }
            return getValue(obj[prop], is, value)
        }
    }

    return template.replace(/\$\{(.+?)\}/g, (match, p1) => getValue(data, p1))
}
