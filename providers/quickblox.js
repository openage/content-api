// 'use strict';

// var client = require('node-rest-client').Client;
// var crypto = require('crypto');
// var async = require('async');
// var logger = require('@open-age/logger')('providers.quickblox');
// // var QuickBlox = require('quickblox').QuickBlox;
// var chatConfig = require('config').get('chat');
// var session = null;
// // var QB = new QuickBlox();

// var getUrl = function (api, id) {
//     if (id) {
//         return chatConfig.url + api + '/' + id + ".json";
//     }

//     return chatConfig.url + api + ".json";
// };


// var needsLogin = function (errors) {
//     if (!session) {
//         return true;
//     }
//     var sessionExpired = errors &&
//         errors.base &&
//         errors.base.length !== 0 &&
//         errors.base[0] === 'Required session does not exist';

//     if (sessionExpired) {
//         session = null;
//     }
//     return sessionExpired;
// };

// var getArgs = function (data) {
//     var args = {
//         headers: {
//             "QuickBlox-REST-API-Version": chatConfig.version,
//             "Content-Type": "application/json"
//         }
//     };

//     if (session) {
//         args.headers["QB-Token"] = session.token;
//     }

//     if (data) {
//         args.data = data;
//     }

//     return args;
// };


// var login = function (callback) {
//     var log = logger.start('login');
//     QB.init(chatConfig.appID, chatConfig.authKey, chatConfig.authSecret);

//     QB.createSession(function (err, result) {
//         if (err) {
//             log.error(err);
//             if (callback) {
//                 callback(err);
//             }
//             return;
//         }
//         log.info('logged in');
//         session = result;
//         if (callback) {
//             callback();
//         }
//     });
// };

// var userLogin = function (id, callback) {
//     var log = logger.start('userLogin');
//     var params = { login: id, password: 'fundo@123' };

//     QB.login(params, function (err, user) {
//         if (user) {
//             log.debug('got user: %s', id, user);
//         } else {
//             log.error(err);
//         }
//         callback(null, user);
//     });

// }

// var getUser = function (userName, callback) {
//     var log = logger.start('getUser');
//     var params;
//     log.debug('getting user: %s', userName);
//     if (!userName.id) {
//         params = { login: userName };
//     } else {
//         params = userName.id;
//     }
//     QB.users.get(params, function (err, user) {
//         if (user) {
//             log.debug('got user: %s', userName, user);
//         } else {
//             log.error(err);
//         }
//         callback(null, user);
//     });
// };

// var createUser = function (userInfo, callback) {
//     var log = logger.start('createUser');
//     var data = {
//         login: userInfo.id || userInfo.login,
//         full_name: userInfo.name || userInfo.full_name,
//         password: 'fundo@123'
//     };
//     async.waterfall([
//         function (cb) {
//             // if (needsLogin()) {
//             return login(cb);
//             // }
//             // cb(null);
//         },
//         function (cb) {
//             log.debug('checking if user exists');
//             getUser(userInfo.id, cb);
//         },
//         function (user, cb) {
//             if (user) {
//                 log.info('user already exists. Using that');
//                 return cb(null, user);
//             }
//             log.debug('user does not exist');
//             QB.users.create(data, function (err, user) {
//                 if (user) {
//                     cb(null, user);
//                 } else {
//                     cb(err);
//                 }
//             });
//         }
//     ], function (errors, user) {
//         if (needsLogin(errors)) {
//             createUser(data, callback);
//         } else if (errors) {
//             log.error(errors);
//             return callback(errors);
//         } else {

//             // {
//             //     if (errors && errors.login && errors.login[0] === 'has already been taken') {
//             //         return getUser(userName, callback);
//             //     }
//             log.info('done', user);
//             user.password = 'fundo@123';
//             return callback(null, user);
//         }
//     });
// };

// var deleteUser = function (id, callback) {
//     var log = logger.start('deleteUser');
//     async.waterfall([
//         function (cb) {
//             if (needsLogin()) {
//                 return login(cb);
//             }
//             cb(null);
//         },
//         function (cb) {
//             log.debug('sending request');
//             (new client()).delete(getUrl('users', id), getArgs(), function (response) {
//                 cb(response.errors);
//             });
//         }
//     ], function (errors) {
//         if (needsLogin(errors)) {
//             deleteUser(id, callback);
//         } else {
//             if (errors) {
//                 log.error(errors);
//             } else {
//                 log.info('done');
//             }
//             return callback(errors);
//         }
//     });
// };

// var updateUser = function (id, data, callback) {
//     var log = logger.start('updateUser');
//     async.waterfall([
//         function (cb) {
//             if (needsLogin()) {
//                 return login(cb);
//             }
//             cb(null);
//         },
//         function (cb) {
//             log.debug('checking if user exists');
//             getUser({ id: id }, function (err, user) {
//                 if (err) {
//                     log.error('failed to get user');
//                     cb(err);
//                 }
//                 cb(null, user);
//             });
//         },
//         function (user, cb) {
//             userLogin(user.login, function (err, user) {
//                 if (err) {
//                     log.error('failed to login');
//                     cb(err);
//                 }
//                 cb(null, user);
//             })
//         },
//         function (user, cb) {
//             QB.users.update(id, { full_name: data.full_name }, function (err, user) {
//                 if (user) {
//                     cb(null, user);
//                 } else {
//                     log.error('Failed to Update');
//                     cb(err);
//                 }
//             });
//             // (new client()).put(getUrl('users', id), getArgs({
//             //     user: data
//             // }), function(response) {
//             //     if (response.errors) {
//             //         log.error(response.errors);
//             //     } else {
//             //         log.info('done');
//             //     }
//             //     cb(response.errors);
//             // });
//         }
//     ], function (errors, user) {
//         if (needsLogin(errors)) {
//             updateUser(id, data, callback);
//         } else {
//             return callback(errors);
//         }
//     });
// };

// var notifyUser = function (data, callback) {
//     var log = logger.method('notifyUser');
//     async.waterfall([
//         function (cb) {
//             if (needsLogin()) {
//                 return login(cb);
//             }
//             cb(null);
//         },
//         function (cb) {
//             log.debug('request sent', data);
//             (new client()).post(getUrl('events.json'), getArgs({
//                 event: data
//             }), function (response) {
//                 if (response.errors) {
//                     log.error(response.errors);
//                     cb(response.errors);
//                 } else {
//                     log.debug(response);
//                 }
//                 cb(response.errors);
//             });
//         }
//     ], function (errors) {
//         if (needsLogin(errors)) {
//             notifyUser(data, callback);
//         } else {
//             return callback(errors);
//         }
//     });
// };

// var messageUser = function (id, message, callback) {
//     var log = logger.method('messageUser');
//     async.waterfall([
//         function (cb) {
//             if (needsLogin()) {
//                 return login(cb);
//             }
//             cb(null);
//         },
//         function (cb) {
//             var data = {
//                 "message": message,
//                 "recipient_id": id
//             };
//             log.debug('request sent', data);
//             (new client()).post(getUrl('message.json'), getArgs(data), function (response) {
//                 cb(response.errors);
//             });
//         }
//     ], function (errors) {
//         if (needsLogin(errors)) {
//             messageUser(id, message, callback);
//         } else {
//             return callback(errors);
//         }
//     });
// };


// exports.createUser = function (data, callback) {
//     if (chatConfig.disabled) {
//         logger.error('disabled');
//         return callback(null, {});
//     }
//     return createUser(data, callback);
// };

// exports.updateUser = function (id, data, callback) {
//     if (chatConfig.disabled) {
//         logger.error('disabled');
//         return callback(null, {});
//     }
//     return updateUser(id, data, callback);
// };

// exports.deleteUser = function (data, callback) {
//     if (chatConfig.disabled) {
//         logger.error('disabled');
//         return callback(null, {});
//     }
//     return deleteUser(data, callback);
// };

// exports.notify = function (deviceId, data, callback) {
//     if (chatConfig.disabled) {
//         logger.error('disabled');
//         return callback(null, {});
//     }
//     return notifyUser(data, callback);
// };

// exports.chat = function (id, message, callback) {
//     if (chatConfig.disabled) {
//         logger.error('disabled');
//         return callback(null, {});
//     }
//     return messageUser(id, message, callback);
// };

// var init = function () {
//     if (chatConfig.disabled) {
//         logger.error('disabled');
//         return;
//     }
//     if (!session) {
//         login();
//     }
// };

// init();
