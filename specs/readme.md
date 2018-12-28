# guidelines for creating the spec

the `index.file` uses the files in `definitions` and `paths` folder to construct the spec doc

```JavaScript
{
    swagger: '2.0',
    info: {
        version: require('../package.json').version,
        title: require('../package.json').name
    },
    host: require('config').webServer.rootUrl,
    basePath: '/api',
    schemes: [
        'http'
    ],
    consumes: [
        'application/json'
    ],
    produces: [
        'application/json'
    ],
    paths: {},
    definitions: {}
}
```

It fetches the `info` from the `package.json` and `host` from `webServer` settings in config

## path

each file in the paths folder is a path. The `paths/index.js` file compiles all the files into collection of paths.

Typically this has you can define a path in following 2 format 

### bare bones

```JavaScript
[{
    url: '/',
    get: { parameters: ['x-role-key'] }, // a search api
    post: { parameters: ['x-role-key'] }, // a create api
}, {
    url: '/{id}',
    get: { parameters: ['x-role-key'] }, // get an item
    put: { parameters: ['x-role-key'] }, // update an item
    delete: { parameters: ['x-role-key'] } // delete an item
}]

```

### swagger style

```JavaScript
[{
    url: '/',
    post: {
        summary: 'search ',
        description: 'search the entity',
        operationId: 'search-id',
        consumes: ['application/json'],
        parameters: [
            { in: 'query', name: 'type', type: 'string', required: true },
            { in: 'query', name: 'category', type: 'string', required: true }
        ]
    }
```

## definitions

`definitions/index.js` file compiles all the files into collection of definition. 
If name is not specified, it uses the `file-name` and converts it to `camelCase` based definition. Each file is converted into following definitions

1. modelReq - used input for api
2. modelRes - used as standard response for create and update operations
3. modelPageRes - used as standard response for search operations

The path uses them as default schema in the request


You can add definitions in 2 formats

### bare bones

```JavaScript
  module.exports = {
      firstName: 'string',
      lastName: 'string',
      dob: 'string',
      gender: 'string',
      pic: {
          url: 'string',
          thumbnail: 'string'
      }
  }
```

### swagger style

```JavaScript
{
    name: 'modelResponse',
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

```
