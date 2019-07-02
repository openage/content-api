'use strict'
var moment = require('moment')

const day = (date) => {
    let day = date ? moment(date).weekday() : moment().weekday()

    switch (day) {
    case 0:
        return 'sunday'
    case 1:
        return 'monday'
    case 2:
        return 'tuesday'
    case 3:
        return 'wednesday'
    case 4:
        return 'thursday'
    case 5:
        return 'friday'
    case 6:
        return 'saturday'
    }
}

exports.day = day

exports.diff = (date1, date2) => {
    let value = moment(date1).diff(moment(date2), 'seconds')
    if (value < 0) {
        value = -value
    }
    return value
}
exports.days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday']

exports.minutes = (fromMinutes) => {
    return {
        toString: () => {
            let hoursWorked = Math.floor(fromMinutes / 60)
            let minutesWorked = Math.floor(fromMinutes - hoursWorked * 60)

            let hours = '00'
            if (hoursWorked === 0) {
                hours = '00'
            } else if (hoursWorked < 10) {
                hours = `0${hoursWorked}`
            } else {
                hours = `${hoursWorked}`
            }

            let minutes = '00'
            if (minutesWorked === 0) {
                minutes = '00'
            } else if (minutesWorked < 10) {
                minutes = `0${minutesWorked}`
            } else {
                minutes = `${minutesWorked}`
            }

            return `${hours}:${minutes}`
        }
    }
}
exports.time = (time1) => {
    time1 = time1 || new Date()
    return {
        diff: (time2, actual) => {
            let value = moment(time1).diff(moment(time2), 'seconds')

            if (actual) {
                return value
            }
            if (value < 0) {
                value = -value
            }

            return value
        },

        add: (minutes) => {
            return moment(time1).add(minutes, 'minute').toDate()
        },
        subtract: (minutes) => {
            return moment(time1).subtract(minutes, 'minute').toDate()
        },
        span: (time2) => {
            let date = moment()

            let timeA = date
                .set('hour', moment(time1).get('hour'))
                .set('minute', moment(time1).get('minute'))
                .set('second', moment(time1).get('second'))
                .set('millisecond', moment(time1).get('millisecond')).toDate()

            let timeB = date
                .set('hour', moment(time2).get('hour'))
                .set('minute', moment(time2).get('minute'))
                .set('second', moment(time2).get('second'))
                .set('millisecond', moment(time2).get('millisecond')).toDate()

            let value = moment(timeA).diff(moment(timeB), 'minutes')

            if (value < 0) {
                value = -value
            }

            let hours = value / 60

            hours = parseInt(hours.toFixed(2))
            let minutes = value - hours * 60

            if (hours === 0) {
                hours = '00'
            } else if (hours < 10) {
                hours = `0${hours}`
            }

            if (minutes === 0) {
                minutes = '00'
            } else if (minutes < 10) {
                minutes = `0${minutes}`
            }
            return `${hours}:${minutes}`
        },
        isBetween: (from, till) => {
            return moment(time1).isBetween(moment(from), moment(till), 's', '[]')
        },
        lt: (time2) => {
            if (!time2 || (!time1 && !time2)) {
                return false
            }

            if (!time1) {
                return true
            }

            let date = new Date()

            let timeA = moment(date)
                .set('hour', moment(time1).hour())
                .set('minute', moment(time1).minutes())
                .set('second', moment(time1).seconds())

            let timeB = moment(date)
                .set('hour', moment(time2).hour())
                .set('minute', moment(time2).minutes())
                .set('second', moment(time2).seconds())

            return (timeA.isBefore(timeB, 's'))
        },
        gt: (time2) => {
            if (!time2 || (!time1 && !time2)) {
                return false
            }

            if (!time1) {
                return true
            }

            let date = new Date()

            let timeA = moment(date)
                .set('hour', moment(time1).hour())
                .set('minute', moment(time1).minutes())
                .set('second', moment(time1).seconds())

            let timeB = moment(date)
                .set('hour', moment(time2).hour())
                .set('minute', moment(time2).minutes())
                .set('second', moment(time2).seconds())

            return (timeA.isAfter(timeB, 's'))
        }
    }
}

exports.date = (date1) => {
    date1 = date1 || new Date()
    return {
        day: () => {
            return day(date1)
        },
        bod: () => {
            return moment(date1).startOf('day').toDate()
        },

        bom: () => {
            return moment(date1).startOf('month').toDate()
        },
        previousWeek: () => {
            return moment(date1).subtract(7, 'days').startOf('day').toDate()
        },
        previousBod: () => {
            return moment(date1).subtract(1, 'day').startOf('day').toDate()
        },
        nextBod: () => {
            return moment(date1).add(1, 'day').startOf('day').toDate()
        },
        nextWeek: () => {
            return moment(date1).add(7, 'days').startOf('day').toDate()
        },
        eod: () => {
            return moment(date1).endOf('day').toDate()
        },
        eom: () => {
            return moment(date1).endOf('month').toDate()
        },
        add: (days) => {
            return moment(date1).add(days, 'day').toDate()
        },
        subtract: (days) => {
            return moment(date1).subtract(days, 'day').toDate()
        },
        setTime: (time) => {
            return moment(date1)
                .set('hour', moment(time).get('hour'))
                .set('minute', moment(time).get('minute'))
                .set('second', moment(time).get('second'))
                .set('millisecond', moment(time).get('millisecond')).toDate()
        },

        isSame: (date2) => {
            return moment(date1).startOf('day').isSame(moment(date2).startOf('day'))
        },

        isToday: () => {
            return moment(date1).startOf('day').isSame(moment(new Date()).startOf('day'))
        },
        isPast: () => {
            return moment(date1).startOf('day').isBefore(moment(new Date()).startOf('day'))
        },
        isBetween: (from, till) => {
            return moment(date1).isBetween(moment(from), moment(till), 'day', '[]')
        },
        toString: (format) => {
            format = format || 'dddd, MMMM Do YYYY'
            return moment(date1).format(format)
        }
    }
}
