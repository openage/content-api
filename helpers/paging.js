'use strict'

exports.extract = req => {
    let serverPaging = req.query.serverPaging
    if (serverPaging === undefined) {
        if (req.query.pageNo !== undefined || req.query.pageSize !== undefined) {
            serverPaging = true
        }
    }
    let pageNo = req.query.pageNo ? Number(req.query.pageNo) : 1
    let pageSize = req.query.pageSize ? Number(req.query.pageSize) : 10
    let offset = pageSize * (pageNo - 1)

    return serverPaging ? {
        pageNo: pageNo,
        limit: pageSize,
        skip: offset
    } : null
}
