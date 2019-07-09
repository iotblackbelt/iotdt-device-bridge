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

var resource = '0b07f429-9f4b-4714-9392-cc5e8e80c8b0';

let dtToken;

module.exports = async function (context, req) {
    try {
        await handleMessage({ ...parameters, log: context.log, getToken: getDigitalTwinToken }, req.body.device, req.body.measurements, req.body.timestamp);
    } catch (e) {
        context.log('[ERROR]', e.message);

        context.res = {
            status: e.statusCode ? e.statusCode : 500,
            body: e.message
        };
    }
}

/**
 * Fetches a digital twin token.
 */
async function getDigitalTwinToken(context, forceTokenRefresh = true) {
    if (!dtToken || forceTokenRefresh) {
        const options = {
            url: parameters.authorityHostUrl,
            method: 'POST',
            headers: {
                'content-type': 'application/json'
            },
            form: {
                'grant_type': 'client_credentials',
                'client_id': parameters.clientId,
                'client_secret': parameters.clientSecret,
                'resource': resource
            }
        }

        try {
            context.log('[HTTP] Requesting new Digital Twin token');
            const response = await request(options);
            dtToken = response.access_token;
        } catch (e) {
            throw new Error('Unable to get Digital Twin token');
        }
    }

    return dtToken;
}