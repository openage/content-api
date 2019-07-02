'use strict'
var db = global.db

let findOrg = data => {
    return db.organization.find({
        where: data
    })
}
exports.findOrg = findOrg

let findEmployee = data => {
    return db.employee.find({
        where: data,
        include: [db.designation, db.organization]
    })
}
exports.findEmployee = findEmployee

let findEmployees = data => {
    return db.employee.findAll({
        where: data,
        include: [db.designation]
    })
}
exports.findEmployees = findEmployees
