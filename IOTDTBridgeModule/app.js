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

// Create a context object that is normally present in an Azure function
// log is used with the iotdt bridge
let context = {
  log(args) {
    console.log(args);
  }
}

// Get the module client
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

// This function just pipes the messages to the iotc bridge without any change.
async function pipeMessage(client, inputName, msg) {
  client.complete(msg, console.log('[INFO] Receiving message'));

  // Check if the message is sent to the iotdt input, if not ignore
  if (inputName === 'iotdt') {
    if (msg) {
      // Create the message as the iotc bridge expects it to be [req]
      var req = JSON.parse(msg.getBytes().toString('utf8'));
      // Pass the context and req object parts to the iotc bridge
      try {
        await handleMessage({ ...parameters, log: context.log, getToken: getDigitalTwinToken }, req.device, req.measurements, req.timestamp);
      } catch (e) {
          context.log('[ERROR] ' + e.message);
      }
    }
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
          context.log('[INFO] Requesting new Digital Twin token');
          const response = await request(options);
          dtToken = response.access_token;
      } catch (e) {
          throw new Error('Unable to get Digital Twin token');
      }
  }

  return dtToken;
}