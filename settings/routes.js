'use strict';
var models = require('mongoose').models;
var auth = require('../middleware/authorization');
var passport = require('passport');
var apiRoutes = require('../helpers/apiRoutes');
var fs = require('fs');
var loggerConfig = require('config').get('logger');
var appRoot = require('app-root-path');

module.exports.configure = function(app) {
    app.get('/', function(req, res) {
        res.render('index', { title: 'Aqua Social API' });
    });
    app.get('/swagger', function(req, res) {
        res.writeHeader(200, { "Content-Type": "text/html" });
        fs.readFile('./public/swagger.html', null, function(err, data) {
            if (err) {
                res.writeHead(404);
            }
            res.write(data);
            res.end();
        });
    });
    app.get('/logs', function(req, res) {
        var filePath = appRoot + '/' + loggerConfig.file.filename;

        fs.readFile(filePath, function(err, data) {
            res.contentType("application/json");
            res.send(data);
        });
    });
    var api = apiRoutes(app);

    api.model('notifications')
        .register('REST', auth.requiresToken);
    api.model('admin')
    .register('REST')
        .register([{
                action: 'GET',
                url: '/status/:id',
                method: 'getStatus',
                filter: auth.canHaveToken
            },
            {
                action: 'GET',
                url: '/classroom/:courseId/',
                method: 'getStudentsStatus',
                filter: auth.canHaveToken
            },
            {
                action: 'GET',
                url: '/members/:batchId',
                method: 'getClassMembers',
                filter: auth.canHaveToken
            }, {
                action: 'PUT',
                url: '/:communityId',
                method: 'activateProfile',
                filter: auth.requiresToken
            }, {
                action: 'PUT',
                url: '/removeMe/:communityId',
                method: 'removeMeFromClassroom',
                filter: auth.requiresToken
            }, {
                action: 'PUT',
                url: '/setMeIn/:communityId',
                method: 'assignClassRoom',
                filter: auth.requiresToken
            },
            // {
            //     action: 'PUT',
            //     url: '/mute/:id',
            //     method: 'muteUser',
            //     filter: auth.canHaveToken
            // },
            {
                action: 'PUT',
                url: '/members/:id',
                method: 'updateMember',
                filter: auth.requiresToken
            },
            {
                action: 'PUT',
                url: '/unFollow/:id',
                method: 'unFollow',
                filter: auth.requiresToken
            },
            {
                action: 'GET',
                url: '/members/:type/:status',
                method: 'getMembersByStatus',
                filter: auth.requiresToken
            },
            {
                action: 'GET',
                url: '/dashboard/public',
                method: 'getPublicCommunities',
                filter: auth.requiresToken
            },
            {
                action: 'GET',
                url: '/staff/',
                method: 'getStaffRoom',
                // filter: auth.requiresToken
            },
            {
                action: 'GET',
                url: '/schools/',
                method: 'schools',
                // filter: auth.requiresToken
            },
            {
                action: 'GET',
                url: '/class/',
                method: 'getClassRoom',
                // filter: auth.requiresToken
            },
            {
                action: 'GET',
                url: '/FollowableGroups/',
                method: 'FollowableGroups',
                // filter: auth.requiresToken
            },
            {
                action: 'POST',
                url: '/member/',
                method: 'getMember',
                // filter: auth.requiresToken
            },
            {
                action: 'POST',
                url: '/batch',
                method: 'createBatch',
                filter: auth.requiresToken
            },
            {
                action: 'PUT',
                url: '/publicDashboard/:communityId',
                method: 'publicDashboard',
                filter: auth.requiresToken
            },
            {
                action: 'PUT',
                url: '/shareCommunity/:communityId',
                method: 'shareCommunitySchool',
                filter: auth.requiresToken
            }, {
                action: 'PUT',
                url: '/profileShare/:profileId',
                method: 'sharedProfile',
                filter: auth.requiresToken
            },
            {
                action: 'PUT',
                url: '/shareProfileSchool/:profileId',
                method: 'shredProfileSchool',
                filter: auth.requiresToken
            }
            ,
            {
                action: 'PUT',
                url: '/membersInStaffRoom/:type',
                method: 'membersInStaffRoom',
                filter: auth.requiresSchool
            },
            {
                action: 'PUT',
                url: '/courseArchive/:id',
                method: 'courseArchive',
              //  filter: auth.requiresSchool
            },
            {
                action: 'PUT',
                url: '/makeOwner/:communityId',
                method: 'makeOwner',
                filter: auth.requiresToken
            },
            
            {
                action: 'PUT',
                url: '/updateProfile/:id',
                method: 'updateProfile',
                filter: auth.requiresToken
            },
            {
                action: 'PUT',
                url: '/addFollower/:communityId',
                method: 'addFollower',
                filter: auth.requiresToken
            },
            {
                action: 'POST',
                url: '/addStudent',
                method: 'addStudent',
                filter: auth.requiresSchool
            }
            // ,
            // {
            //     action: 'GET',
            //     url: '/getSudents',
            //     method: 'getSudents',
            //     // filter: auth.canHaveToken
            // }
        ]);
    api.model('users')
        .register('REST', auth.requiresSchool)
        .register([{
                action: 'POST',
                url: '/signUp',
                method: 'create',
                filter: auth.requiresSchool
            },
            {
                action: 'POST',
                url: '/signIn',
                method: 'signIn',
                filter: auth.requiresSchool
            },
            {
                action: 'POST',
                url: '/:id/validatePin',
                method: 'validatePin',
                filter: auth.requiresSchool
            }, {
                action: 'POST',
                url: '/signupFacebook',
                method: 'signupFacebook',
                filter: auth.requiresSchool
            }, {
                action: 'POST',
                url: '/jabber',
                method: 'getbyjabber',
                filter: auth.requiresSchool
            },{
                action: 'POST',
                url: '/logIn',
                method: 'logIn',
                filter: auth.requiresSchool
            },{
                action: 'POST',
                url: '/:userId/devices',
                method: 'deviceManger',
                filter: auth.requiresSchool
            }
        ]);

    api.model('profiles')
        // .register('REST', auth.requiresToken)
        .register([{
                action: 'GET',
                method: 'search',
                filter: auth.canHaveToken
            }, {
                action: 'GET',
                url: '/:id',
                method: 'get',
                filter: auth.requiresToken
            }, {
                action: 'GET',
                url: '/my/waiters',
                method: 'getMyWaiters',
                filter: auth.requiresToken
            }, {
                action: 'POST',
                method: 'create',
                filter: auth.requiresToken
            }, {
                action: 'PUT',
                url: '/:id',
                method: 'update',
                filter: auth.requiresToken
            }, {
                action: 'POST',
                url: '/invite',
                method: 'invite',
                filter: auth.requiresToken
            }, {
                action: 'POST',
                url: '/:id/notify',
                method: 'notify',
                filter: auth.requiresToken
            },
            {
                action: 'PUT',
                url: '/againRequestIn/:communityId',
                method: 'againRequest',
                filter: auth.requiresToken
            },
            //  {
            //     action: 'PUT',
            //     url: '/admin/accept',
            //     method: 'acceptRequest',
            //     filter: auth.requiresToken
            // },
            // {
            //     action: 'PUT',
            //     url: '/admin/setmonitor',
            //     method: 'setMonitor',
            //     filter: auth.requiresToken
            // },
            // {
            //     action: 'PUT',
            //     url: '/admin/reject',
            //     method: 'rejectRequest',
            //     filter: auth.requiresToken
            // }
        ]);

    api.model('notes')
        .register('REST', auth.requiresToken)
        .register([{
            action: 'POST',
            method: 'create',
            url: '/:recipientId',
            filter: auth.requiresToken
        }, {
            action: 'GET',
            method: 'getAll',
            url: '/recipient/:id',
            filter: auth.requiresToken
        }]);

    api.model('messages')
        .register([{
            action: 'POST',
            method: 'create',
            filter: auth.requiresToken
        }, {
            action: 'POST',
            url: '/reportAbuse',
            method: 'reportAbuse',
            filter: auth.requiresToken
        }]);

    // restApi('profiles', app)
    //     .addPost('my/recipients', 'createRecipient', false)
    //     .addPost('imageUpload', 'imageUpload', false)
    //     .addDelete('my/interests/:id', 'delinkInterest', false)
    //     .addPut('linkInterest/:id', 'linkInterest', false)
    //     .addGet(':my/notifications', 'notifications', false)
    //     .addGet('my/profile', 'getMyProfile', false)
    //     .addPut(':profileId/createComment', 'createComment', false)
    //     .addPut('updateComment/:commentId', 'updateComment', false)
    //     .addGet(':profileId/allComments', 'allComments', false)
    //     .addPut(':communityId/joinCommunity', 'joinCommunity', false)
    //     .addPut(':communityId/leaveCommunity', 'leaveCommunity', false)
    //     .addPost('sharingProfile/profileId', 'sharingProfile', false);

    // restApi('medicineRoutines', app);

    // restApi('genders', app);
    // restApi('activities', app)
    //     .addPut(':eventId/delinkTag/:id', 'delinkTag', false)
    //     .addPut(':eventId/linkTag/:id', 'linkTag', false)
    //     .addPut(':id/likeActivities', 'likeActivities', false)
    //     .addPut(':id/toArchive', 'toArchive', false)
    //     .addPut(':id/createComment', 'createComment', false)
    //     .addPut('updateComment/:id', 'updateComment', false)
    //     .addPut(':id/retrive', 'retrive', false)
    //     .addPut(':id/dislikeActivities', 'dislikeActivities', false)
    //     .addGet('my/archived', 'archived', false);


    // restApi('masterMethods', app);

    // restApi('posts', app)
    //     .addPut(':postId/delinkTag/:id', 'delinkTag', false)
    //     .addPut(':postId/linkTag/:id', 'linkTag', false)
    //     .addPut(':postId/createComment', 'createComment', false)
    //     .addPut('updateComment/:id', 'updateComment', false)
    //     .addPut(':id/toArchive', 'toArchive', false)
    //     .addPut(':id/retrive', 'retrive', false)
    //     .addGet('my/archived', 'archived', false);

    // restApi('upload', app)
    //     .addPost(':type', 'uploadOtherDetails', true);
    // restApi('plannerTypes', app);
    // restApi('healthChartTypes', app);
    // restApi('healthCharts', app)
    //     .addPut(':id/healthRecord', 'healthRecord', false);

    // restApi('healthRecordings', app);
    // restApi('journals', app);
    // restApi('master', app);

    // restApi('planners', app);

    api.model('connections')
        .register([{
                action: 'POST',
                method: 'create',
                filter: auth.requiresToken
            }, {
                action: 'GET',
                method: 'get',
                url: '/:id',
                filter: auth.canHaveToken
            }, {
                action: 'PUT',
                url: '/:id',
                method: 'update',
                filter: auth.requiresToken
            }, {
                action: 'GET',
                method: 'search',
                filter: auth.canHaveToken
            },
            {
                action: 'PUT',
                url: '/cancel/:id',
                method: 'cancelRequest',
                filter: auth.canHaveToken
            }
        ]);
    // restApi('connections', app)
    //     .addPost('shareProfile', 'shareProfile', false)
    //     .addPut(':id/block', 'block', false)
    //     .addPut(':id/acceptJoin', 'acceptJoin', false)
    //     .addPut(':id/rejectJoin', 'rejectJoin', false)
    //     .addPut(':id/pinProfile', 'pinProfile', false)
    //     .addGet('my/getSharedPermissions', 'getSharedPermissions', false)
    //     .addGet('my/getPinned', 'getPinned', false)
    //     .addGet('my/getShared', 'getShared', false)
    //     .addPut(':id/updateShare', 'updateShareProfile', false);
    api.model('tags')
        .register('REST', auth.requiresToken);
    api.model('communities')
        .register([{
                action: 'POST',
                method: 'create',
                filter: auth.requiresToken
            }, {
                action: 'GET',
                method: 'get',
                url: '/:id',
                filter: auth.canHaveToken
            }, {
                action: 'GET',
                method: 'getMyClassRooms',
                url: '/my/classRooms',
                filter: auth.requiresToken
            }, {
                action: 'PUT',
                url: '/:id',
                method: 'update',
                filter: auth.requiresToken
            }, {
                action: 'GET',
                method: 'search',
                filter: auth.canHaveToken
            },
            // {
            //     action: 'GET',
            //     url: '/my/:id',
            //     method: 'search',
            //     filter: auth.canHaveToken
            // },
            {
                action: 'GET',
                url: "/display/:id/:date",
                method: 'communityDisplay',
                filter: auth.canHaveToken
            },
            {
                action: 'GET',
                method: 'getStats',
                url: '/statsFrom/:fromDate',
                filter: auth.requiresToken
            }


        ]);

    api.model('schools').register('REST');

    api.model({
        root: 'communities/:communityId/members',
        controller: 'members'
    }).register('REST', auth.requiresToken);

    api.model('activities')
        .register([{
            action: 'POST',
            method: 'create',
            filter: auth.requiresToken
        }, {
            action: 'GET',
            method: 'get',
            url: '/:id',
            filter: auth.canHaveToken
        }, {
            action: 'PUT',
            url: '/:id',
            method: 'update',
            filter: auth.requiresToken
        }, {
            action: 'GET',
            method: 'search',
            filter: auth.canHaveToken
        }, {
            action: 'GET',
            method: 'myClassActivities',
            url: '/class/activities',
            filter: auth.requiresToken
        }]);
    // to be used only for get update and delete, search
    //api.model('members').register('REST',auth.requiresToken);
    api.model({
            root: 'communities/:communityId/activities',
            controller: 'activities'
        })
        .register([{
            action: 'POST',
            method: 'create',
            filter: auth.requiresToken
        }]);

    api.model('comments')
        .register('REST', auth.requiresToken); // to be used only for get update and delete, search

    api.model({
            root: 'activities/:activityId/comments',
            controller: 'comments'
        })
        .register([{
            action: 'POST',
            method: 'create',
            filter: auth.requiresToken
        }]);

    api.model({
        root: 'activities/:activityId/participants',
        controller: 'participants'
    }).register('REST', auth.requiresToken);

    // restApi('communities', app)
    //     .addPut(':notificationId/acceptInvition', 'acceptInvition', false)
    //     .addGet(':communityId/searchActivities', 'searchActivities', false)
    //     .addGet(':communityId/searchPosts', 'searchPosts', false)
    //     .addPost(':communityId/createActivity', 'createActivity', false)
    //     .addPut('updateActivity/:activityId', 'updateActivity', false)
    //     .addPost(':communityId/createPost', 'createPost', false)
    //     .addPut('updatePost/:postId', 'updatePost', false)
    //     .addPut(':notificationId/rejectInvitation', 'rejectInvitation', false)
    //     .addPut(':communityId/memberOut/:profileId', 'memberOut', false);

    api.model('interests')
        .register('REST', auth.requiresToken)
        .register({
            action: 'POST',
            method: 'createMany',
            url: '/createMany'
        });
    // restApi('interests', app);
    api.model('courses').register('REST')
     .register({
            action: 'GET',
            method: 'getById',
            url: '/getById/:id'
        });;
    api.model('batches')
        .register([{
            action: 'GET',
            method: 'get',
            url: '/:id',
        }, {
            action: 'PUT',
            method: 'update',
            url: '/:batchId',
            filter: auth.requiresToken
        }]);

    api.model('tunnels')
        .register([{
                action: 'POST',
                method: "create"
            },
            {
                action: 'POST',
                method: 'importEmployees',
                url: '/importEmployees',
                filter:  auth.requiresToken
            },
            {
                action: 'POST',
                method: 'getCourses',
                url: '/getCourses',
                filter:  auth.requiresToken
            }
        ]);
};