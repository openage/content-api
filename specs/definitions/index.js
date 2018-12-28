'use strict'
const fs = require('fs')
const changeCase = require('change-case')

const definitions = {}

const formDefinition = (data) => {
    let def = {}

    if (typeof data === 'string') {
        return {
            type: data
        }
    }

    for (var key in data) {
        if (key === '$description') {
            def.description = data[key]
        } else if (key === '$type') {
            def.type = getType(data[key])
        } else if (key === '$example') {
            def.example = data[key]
        } else if (Array.isArray(data[key])) {
            const arrayModel = data[key].length ? data[key][0] : {}
            const itemDef = {}
            if (Array.isArray(arrayModel)) {
                itemDef.type = 'array'
                itemDef.properties = formDefinition(arrayModel)
            } else if (typeof arrayModel === 'object') {
                itemDef.type = 'object'
                itemDef.properties = formDefinition(arrayModel)
            } else {
                itemDef.type = arrayModel
            }

            def[key] = {
                type: 'array',
                items: itemDef
            }
        } else if (typeof data[key] === 'object') {
            if (data[key].$type) {
                def[key] = {
                    type: getType(data[key].$type),
                    description: data[key].$description,
                    example: data[key].$example
                }
            } else {
                def[key] = {
                    type: 'object',
                    properties: formDefinition(data[key])
                }
            }
        } else {
            def[key] = {
                type: getType(data[key])
            }
        }
    }

    return def
}

const getType = type => {
    if (typeof type === 'function' && type.name) {
        return type.name.toLocaleLowerCase()
    } else {
        return type
    }
}

const extract = (data, name) => {
    if (data.properties) {
        return [data]
    }

    let def = formDefinition(data)
    let modelReq = {
        name: `${name}Req`,
        definition: {
            type: 'object',
            properties: def
        }
    }

    let modelRes = {
        name: `${name}Res`,
        definition: {
            type: 'object',
            properties: {
                isSuccess: {
                    type: 'boolean',
                    description: 'true'
                },
                error: {
                    type: 'string',
                    description: 'error details'
                },
                message: {
                    type: 'string',
                    description: 'validation message'
                },
                data: {
                    type: 'object',
                    properties: def
                }
            }
        }
    }

    let pageRes = {
        name: `${name}PageRes`,
        definition: {
            properties: {
                isSuccess: {
                    type: 'boolean',
                    description: 'true'
                },
                error: {
                    type: 'string',
                    description: 'error details'
                },
                message: {
                    type: 'string',
                    description: 'validation message'
                },
                items: {
                    type: 'array',
                    items: {
                        type: 'object',
                        properties: def
                    }
                }
            }
        }
    }

    return [modelReq, modelRes, pageRes]
}

const setDefaults = (data, fileName) => {
    let item = {
        name: null,
        definition: {}
    }

    if (data.definition) {
        item.name = data.name || changeCase.camelCase(fileName)
        item.definition.type = data.definition.type || 'object'
        item.definition.properties = data.definition.properties
    } else if (data.properties) {
        item.name = data.name || changeCase.camelCase(fileName)
        item.definition.type = data.type || 'object'
        item.definition.properties = data.properties
    } else {
        item.name = changeCase.camelCase(fileName)
        item.definition.properties = data
        item.definition.type = 'object'
    }
    return item
}

const fetch = (path) => {
    var id = require.resolve(path)
    if (require.cache[id] !== undefined) {
        delete require.cache[id]
    }

    return require(path)
}

(function () {
    fs.readdirSync(__dirname).forEach(function (file) {
        if (file.indexOf('.js') && file.indexOf('index.js') < 0) {
            let name = file.split('.')[0]
            let data = fetch(`./${file}`)
            if (!data.forEach) {
                data = extract(data, changeCase.camelCase(name))
            }
            data.forEach(item => {
                item = setDefaults(item, name)
                definitions[item.name] = item.definition
            })
        }
    })
})()

module.exports = definitions
