/*!
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */

const request = require('request-promise-native');
const Device = require('azure-iot-device');
const DeviceTransport = require('azure-iot-device-http');
const util = require('util');

const StatusError = require('../error').StatusError;
const resource = '0b07f429-9f4b-4714-9392-cc5e8e80c8b0';

const deviceCache = {};
var dtToken = {
    token: '',
    created: ''
};

/**
 * Forwards external telemetry messages for IoT Digital Twin devices.
 * @param {{ parameters: Object, log: Function }} context 
 * @param {{ deviceId: string }} device 
 * @param {{ [sensor: string]: number }} measurements 
 */
module.exports = async function (context, device, measurements, timestamp) {
    
    if (device) {
        if (!device.deviceId || !/^[a-z0-9\-]+$/.test(device.deviceId)) {
            throw new StatusError('Invalid format: deviceId must be alphanumeric, lowercase, and may contain hyphens.', 400);
        }
    } else {
        throw new StatusError('Invalid format: a device specification must be provided.', 400);
    }

    if (!validateMeasurements(measurements)) {
        throw new StatusError('Invalid format: invalid measurement list.', 400);
    }

    if (timestamp && isNaN(Date.parse(timestamp))) {
        throw new StatusError('Invalid format: if present, timestamp must be in ISO format (e.g., YYYY-MM-DDTHH:mm:ss.sssZ)', 400);
    }

    const client = Device.Client.fromConnectionString(await getDeviceConnectionString(context, device, measurements), DeviceTransport.Http);

    try {
        await util.promisify(client.open.bind(client))();
        context.log('[HTTP] Sending telemetry for device', device.deviceId);

 

        // Iterate through measurements and send as sensors
        for(var measurement in measurements){
            // Get the value
            var sensorValue = {
                SensorValue: measurements[measurement]
            };

            // Create the message
            var message = new Device.Message(JSON.stringify(sensorValue));
            message.properties.add('DigitalTwins-Telemetry', '1.0');
            message.properties.add('DigitalTwins-SensorHardwareId', measurement);
            if (timestamp) {
                message.properties.add('CreationTimeUtc', timestamp);
            }
            
            // Send the message
            await util.promisify(client.sendEvent.bind(client))(message);
        }

        await util.promisify(client.close.bind(client))();
    } catch (e) {
        // If the device was deleted, we remove its cached connection string
        if (e.name === 'DeviceNotFoundError' && deviceCache[device.deviceId]) {
            delete deviceCache[device.deviceId].connectionString;
        }

        throw new Error(`Unable to send telemetry for device ${device.deviceId}: ${e.message}`);
    }
};

/**
 * 
 * @param {{ [sensor: string]: number }} measurements 
 * @returns true if measurements object is valid, i.e., a map of field names to numbers or strings.
 */
function validateMeasurements(measurements) {
    if (!measurements || typeof measurements !== 'object') {
        return false;
    }

    for (const field in measurements) {
        if (typeof measurements[field] !== 'number' && typeof measurements[field] !== 'string') {
            return false;
        }
    }

    return true;
}

/**
 * 
 * @param {{ parameters: Object, log: Function }} context 
 * @param {{ device: Object }} device 
 * @param {{ [sensor: string]: number }} measurements 
 * 
 * @returns connetionString
 */
async function getDeviceConnectionString(context, device, measurements) {
    const deviceId = device.deviceId;
    let connectionString = '';

    deviceCache[deviceId] = {
        ...deviceCache[deviceId]
    }   


    if (deviceCache[deviceId] && deviceCache[deviceId].connectionString) {
        context.log('Retrieved ConnectionString from cache.');
        return deviceCache[deviceId].connectionString;
    }

       
    try {
        context.log('[HTTP] Requesting device connectionstring');

        let getDevice = await request({ 
            method: 'GET',
            json: true,
            url: context.digitalTwinAPIUrl + '/management/api/v1.0/devices?hardwareIds=' + deviceId + '&includes=ConnectionString',
            headers:
                { 'Authorization': 'Bearer ' + await getDigitalTwinToken(context) }
        });

        if (!getDevice[0]) {
            context.log("[HTTP] Device does not exist. Creating new device.");

            await createDevice(context, deviceId, measurements);

        } else {
            connectionString = getDevice[0].connectionString;
        }
    } catch (e) {
        throw new Error(e);
    }

    deviceCache[deviceId].connectionString = connectionString;
    return connectionString;
}

/**
 * 
 * @param {{ parameters: Object, log: Function }} context 
 * @param {{ deviceId: string }} device 
 * @param {{ [sensor: string]: number }} measurements 
 * 
 * @returns createDevice
 */
async function createDevice(context, deviceId, measurements){
    var sensors = [];
    for (measurement in measurements){
        sensors.push({
            "hardwareId": measurement,
            "name": measurement
        });
    }
 
    let createDevice = await request({ 
        method: 'POST',
        json: true,
        url: context.digitalTwinAPIUrl + '/management/api/v1.0/devices/',
        headers:
            { 'Authorization': 'Bearer ' + await getDigitalTwinToken(context) },
        body:
            {
                "hardwareId": deviceId,
                "name": deviceId,
                "spaceId": await getRootSpace(context),
                "createIoTHubDevice": true,
                    "sensors":sensors
            }
    });

    context.log("[HTTP] Created new device with id: "+createDevice);
    return createDevice;
}

/**
 * @param {{ parameters: Object, log: Function }} context 
 * 
 * @returns root space Id
 */
async function getRootSpace(context){
    let rootSpace = await request({ 
        method: 'GET',
        json: true,
        url: context.digitalTwinAPIUrl + '/management/api/v1.0/spaces?maxLevel=1',
        headers:
            { 'Authorization': 'Bearer ' + await getDigitalTwinToken(context) }
    });

    context.log("[HTTP] Root Space id is: "+rootSpace[0].id);
    return rootSpace[0].id;
}

/**
 * 
 * @param {{ parameters: Object, log: Function }} context 
 * 
 * @returns token
 */
async function getDigitalTwinToken(context) {
    if (dtToken.token && dtToken.created && ((Date.now() - dtToken.created) < 60*60*1000)){
        context.log('Getting Digital Twin token from cache');
        return dtToken.token;
    } else {
        
        const options = {
            url: context.authorityHostUrl,
            method: 'POST',
            json: true,
            headers: {
                'content-type': 'application/json'
            },
            form: {
                'grant_type': 'client_credentials',
                'client_id': context.clientId,
                'client_secret': context.clientSecret,
                'resource': resource
            }
        }

        try {
            context.log('[HTTP] Requesting new Digital Twin token');

            var response = await request(options);
            dtToken.token = response.access_token;
            dtToken.created = Date.now();

        } catch (e) {
            throw new Error(e);
        }
    }

    return dtToken.token;
}