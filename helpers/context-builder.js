'use strict';
const logger = require('@open-age/logger')('helpers/context-builder');

const setContext = function (context) {
    logger.start('setContext');

    // if(!context.visitor && !context.user && context.agent.user) {
    //     context.user = context.agent.user
    // }

    // if(!context.visitor && !context.organization && context.agent.organization) {
    //     context.organization = context.agent.organization
    // }

    // if(!context.user && context.visitor.user) {
    //     context.user = context.visitor.user
    // }

    // if(!context.organization && context.visitor.organization) {
    //     context.organization = context.visitor.organization
    // }

    return context;
};

exports.create = (claims) => {

    let user = null;
    if (claims.user) {
        user = Promise.resolve(claims.user);
    } else if (!claims.user) {
        user = Promise.resolve(null);
    } else {
        user = db.user.findOne({
            _id: claims.userId
        });
    }

    let agent = null;
    if (claims.agent) {
        agent = Promise.resolve(claims.agent);
    } else if (!claims.agent) {
        agent = Promise.resolve(null);
    } else {
        agent = db.agent.findOne({
            _id: claims.agentId
        });
    }

    let visitor = null;
    if (claims.visitor) {
        visitor = Promise.resolve(claims.visitor);
    } else if (!claims.visitor) {
        visitor = Promise.resolve(null);
    } else {
        visitor = db.visitor.findOne({
            _id: claims.visitorId
        });
    } 

    let organization = null;
    if (claims.organization) {
        organization = Promise.resolve(claims.organization);
    } else if (!claims.organizationId) {
        organization = Promise.resolve(null);
    } else {
        organization = db.organization.findOne({
            _id: claims.organizationId
        })
    }

    return Promise.all([user, agent, visitor, organization]).spread((user, agent, visitor, organization) => {
        return setContext({
            user: user,
            agent: agent,
            visitor: visitor,
            organization: organization
        });
    });
};