let locks = {}

let lockObject = (resource, log) => {
    log.debug('locked')

    return {
        release: () => {
            log.debug(`released`)

            if (locks[resource] === undefined) {
                log.debug(`was last one`)
                log.end()
                return
            }

            if (locks[resource].length) {
                let lock = locks[resource].pop()
                lock.resolve(lockObject(resource, lock.log))
            }

            if (!locks[resource].length) {
                locks[resource] = undefined
            }
            log.end()
        }
    }
}

exports.acquire = async (resource, context) => {
    let log = context.logger.start(`lock-${resource}-${(new Date()).getTime()}`)

    if (locks[resource] === undefined) {
        locks[resource] = []
        return lockObject(resource, log)
    }

    return new Promise(resolve => {
        locks[resource].push({
            resolve: resolve,
            log: log
        })
    })
}
