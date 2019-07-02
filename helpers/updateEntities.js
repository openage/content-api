'use strict'

exports.update = (entitiesToUpdate, existingModel) => { // both comming as object
    for (var key in entitiesToUpdate) {
        existingModel[key] = entitiesToUpdate[key] // change if exist otherwise add in it
    }
    return existingModel
}
