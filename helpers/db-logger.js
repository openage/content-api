// const db = require('../models')

module.exports = async (level, message, meta, context) => {
    try {
        let model = {
            level: level,
            message: message,
            meta: meta,
            app: process.env.APP
        }

        if (context) {
            if (context.location) {
                model.location = context.location
                if (model.location.startsWith('GET /api/logs')) {
                    return
                }
            }

            if (context.user) {
                model.user = context.user.id || context.user
            }

            if (context.project) {
                model.project = context.project.id || context.project
            }
        }

        // new db.log(model).save()
    } catch (err) { }
}
