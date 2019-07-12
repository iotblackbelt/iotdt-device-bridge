/*!
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */

const request = require('request-promise-native');
const handleMessage = require('./lib/engine');

const parameters = {
    clientId: process.env.ClIENT_ID,
    clientSecret: process.env.CLIENT_SECRET,
    authorityHostUrl: process.env.AUTHORITY_HOST_URL,
    digitalTwinAPIUrl: process.env.IOTDT_API_URL
};

module.exports = async function (context, req) {
    try {
        await handleMessage({ ...parameters, log: context.log }, req.body.device, req.body.measurements, req.body.timestamp);
    } catch (e) {
        context.log('[ERROR]', e.message);

        context.res = {
            status: e.statusCode ? e.statusCode : 500,
            body: e.message
        };
    }
}

