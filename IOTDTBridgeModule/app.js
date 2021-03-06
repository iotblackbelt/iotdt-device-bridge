'use strict';

var Transport = require('azure-iot-device-mqtt').Mqtt;
var Client = require('azure-iot-device').ModuleClient;
// Message handler IOTDT Bridge
const handleMessage = require('./lib/engine');

// Constants to access Digital Twin
const parameters = {
  clientId: process.env.ClIENT_ID,
  clientSecret: process.env.CLIENT_SECRET,
  authorityHostUrl: process.env.AUTHORITY_HOST_URL,
  digitalTwinAPIUrl: process.env.IOTDT_API_URL
};

/**
 *
 * Create a context object that is normally present in an Azure function
 * log is used with the iotdt bridge
 */
let context = {
  log(args) {
    console.log(args);
  }
}

/**
 *  Creates a Module Client from environment
 * 
 *  @param {{ Transport: Transport }} Transport
 */
Client.fromEnvironment(Transport, function (err, client) {
  if (err) {
    throw err;
  } else {
    client.on('error', function (err) {
      throw err;
    });

    // connect to the Edge instance
    client.open(function (err) {
      if (err) {
        throw err;
      } else {
        console.log('[INFO] IoT Hub module client initialized');

        // Act on input messages to the module.
        client.on('inputMessage', function (inputName, msg) {
          pipeMessage(client, inputName, msg);
        });
      }
    });
  }
});

/**
 * 
 * @param {{ client: ModuleClient }} client 
 * @param {{ inputName: string }} inputName 
 * @param {{ msg: Object }} msg 
 */
async function pipeMessage(client, inputName, msg) {
  client.complete(msg, console.log('[INFO] Receiving message'));

  // Check if the message is sent to the iotdt input, if not ignore
  if (inputName === 'iotdt') {
    if (msg) {
      // Create the message as the iotc bridge expects it to be [req]
      var req = JSON.parse(msg.getBytes().toString('utf8'));
      // Pass the context and req object parts to the iotc bridge
      try {
        await handleMessage({ ...parameters, log: context.log }, req.device, req.measurements, req.timestamp);
      } catch (e) {
          context.log('[ERROR] ' + e.message);
      }
    }
  }
}