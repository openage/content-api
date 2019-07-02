'use strict'
var mongoose = require('mongoose')
global.toObjectId = id => mongoose.Types.ObjectId(id)
