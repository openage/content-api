'use strict'

const fs = require('fs')
const changeCase = require('change-case')
const definitions = require('../definitions')
const paths = {}

const setHeaders = (param) => {
    if (!param.name.startsWith('x-')) {
        return param
    }

    if (param.required === undefined) {
        param.required = true
    }
    param.in = param.in || 'header'

    switch (param.name) {
    case 'x-role-key':
        param.description = param.description || 'user role key'
        break
    case 'x-tenant-code':
        param.description = param.description || 'the application code'
        break
    case 'x-organization':
        param.description = param.description || 'the organization code'
        break
    case 'x-client-code':
        param.description = param.description || 'the client code'
        break
    }

    return param
}

const setBody = (param, options, operation) => {
    param.type = param.type || 'object'
    if (param.required === undefined) {
        param.required = true
    }
    if (typeof param.schema === 'string') {
        if (definitions[param.schema]) {
            param.schema = {
                $ref: `#/definitions/${param.schema}`
            }
        }
    } else if (!param.schema) {
        let definition
        if (operation === 'create' && definitions[`${options.name}CreateReq`]) {
            definition = `#/definitions/${options.name}CreateReq`
        } else if (operation === 'update' && definitions[`${options.name}UpdateReq`]) {
            definition = `#/definitions/${options.name}UpdateReq`
        } else {
            definition = `#/definitions/${options.name}Req`
        }
        param.schema = {
            $ref: definition
        }
    }

    return param
}

const setActionDefaults = (action, options) => {
    action.consumes = action.consumes || [
        'application/json'
    ]
    action.produces = action.produces || [
        'application/json'
    ]

    action.parameters = action.parameters || []
    action.responses = action.responses || {}

    let summary = ''
    let description = ''
    let operationId = ''
    let defaultResponse = {
        schema: {
            $ref: `#/definitions/${options.name}Res`
        }
    }

    let addBody = false
    let addId = false
    let addCode = false

    switch (options.type) {
    case 'post':
        if (options.url === '.csv') {
            summary = 'import'
            description = `imports all the items in the posted CSV file`
            operationId = `${options.name}-import`
        } else if (options.url === '/') {
            summary = `create`
            description = `creates new item in ${options.name}`
            operationId = `${options.name}-create`
            addBody = true
        }
        break
    case 'put':
        if (options.url === '/{id}') {
            summary = `update`
            description = `updates an item in ${options.name}`
            operationId = `${options.name}-update`
            addBody = true
            addId = true
        }
        break
    case 'delete':
        summary = `remove`
        description = `removes an item in ${options.name}`
        operationId = 'delete'
        addBody = true
        addId = true
        break
    case 'get':
        if (!options.url || options.url === '' || options.url === '/') {
            summary = `search`
            description = `searches in ${options.name}`
            operationId = `${options.name}-search`
            defaultResponse.schema.$ref = `#/definitions/${options.name}PageRes`
        } else if (options.url === '.csv') {
            summary = `export`
            description = `exports all the items as ${options.name}.csv`
            operationId = `${options.name}-export`
        } else if (options.url === '/{id}') {
            summary = `get`
            description = `gets an item by id in ${options.name}`
            operationId = `${options.name}-get-by-id`
            addId = true
        } else if (options.url === '/{code}') {
            summary = `get`
            description = `gets an item by code in ${options.name}`
            operationId = `${options.name}-get-by-code`
            addCode = true
        } else {
            summary = `get`
            description = `gets an item in ${options.name}`
            operationId = `${options.name}-get`
        }
        break
    }
    action.summary = action.summary || summary
    action.description = action.description || description
    action.operationId = action.operationId || operationId
    action.responses.default = action.responses.default || defaultResponse

    if (!action.tags) {
        action.tags = [options.name]
    }
    if (action.parameters) {
        let parameters = []

        action.parameters.forEach(param => {
            if (typeof param === 'string') {
                param = {
                    name: param
                }
            }
            parameters.push(param)
        })

        action.parameters = parameters

        if (addId) {
            if (!action.parameters.find(value => value.name === 'id')) {
                action.parameters.push({
                    name: 'id'
                })
            }
        }

        if (addCode) {
            if (!action.parameters.find(value => value.name === 'code')) {
                action.parameters.push({
                    name: 'code'
                })
            }
        }
        if (addBody) {
            if (!action.parameters.find(value => value.name === 'body')) {
                action.parameters.push({
                    name: 'body'
                })
            }
        }

        action.parameters.forEach(param => {
            param = setHeaders(param)

            if (options.url === '/{id}') {
                if (param.name === 'id') {
                    param.required = param.required !== undefined ? param.required : true
                    param.in = param.in || 'path'
                    param.description = param.description || 'entity id'
                }
            } else if (options.url === '/' && options.type === 'get') {
                param.in = param.in || 'query'
                if (param.required === undefined) {
                    param.required = false
                }
            }

            switch (options.type) {
            case 'get':
                param.in = param.in || 'path'
                if (param.required === undefined) {
                    param.required = true
                }
                break
            case 'post':
                param.in = param.in || 'body'
                if ('body|model'.indexOf(param.name) !== -1) {
                    param = setBody(param, options, 'create')
                }
                break
            case 'put':
                param.in = param.in || 'body'
                if ('body|model'.indexOf(param.name) !== -1) {
                    param = setBody(param, options, 'update')
                }
                break
            }

            param.type = param.type || 'string'
        })
    }
    return action
}

const setDefaults = (data, name) => {
    let item = {
        url: null,
        actions: {}
    }
    if (!data.url || data.url === '' || data.url === '/') {
        item.url = `/${name}`
    } else if (!data.url.startsWith('/')) {
        item.url = `/${data.url}`
    } else {
        item.url = `/${name}${data.url}`
    }
    if (data.post) {
        item.actions.post = setActionDefaults(data.post, { type: 'post', name: name, url: data.url })
    }
    if (data.put) {
        item.actions.put = setActionDefaults(data.put, { type: 'put', name: name, url: data.url })
    }
    if (data.get) {
        item.actions.get = setActionDefaults(data.get, { type: 'get', name: name, url: data.url })
    }
    if (data.delete) {
        item.actions.delete = setActionDefaults(data.delete, { type: 'delete', name: name, url: data.url })
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
            let name = changeCase.camelCase(file.split('.')[0])
            let data = fetch(`./${file}`)
            if (data.forEach) {
                data.forEach(item => {
                    let path = setDefaults(item, name)
                    paths[path.url] = path.actions
                })
            } else {
                let path = setDefaults(data, name)
                paths[path.url] = path.actions
            }
        }
    })
})()
module.exports = paths
