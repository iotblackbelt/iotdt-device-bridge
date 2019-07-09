'use strict';

var Transport = require('azure-iot-device-mqtt').Mqtt;
var Client = require('azure-iot-device').ModuleClient;
var Message = require('azure-iot-device').Message;

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
        console.log('IoT Hub module client initialized');

        // Act on input messages to the module.
        client.on('inputMessage', function (inputName, msg) {
          pipeMessage(client, inputName, msg);
        });
      }
    });
  }
});

// This function just pipes the messages without any change.
function pipeMessage(client, inputName, msg) {
  client.complete(msg, printResultFor('Receiving message'));

  var json = JSON.parse(msg.getBytes().toString('utf8'));
   // Convert msg to IOTC bridge message structure
  var req = {
    device: {
      deviceId: inputName
    },
    measurements: {
      machine_temperature: json.machine.temperature,
      machine_pressure: json.machine.pressure,
      ambient_temperature: json.ambient.temperature,
      ambient_humidity: json.ambient.humidity
    },
    timestamp: json.timeCreated
  }

  var message = JSON.stringify(req);
  console.log('[JSON] ' + message);
  if (message) {
    var outputMsg = new Message(message);
    client.sendOutputEvent('output', outputMsg, printResultFor('Sending transformed message'));
  }
}

// Helper function to print results in the console
function printResultFor(op) {
  return function printResult(err, res) {
    if (err) {
      console.log(op + ' error: ' + err.toString());
    }
    if (res) {
      console.log(op + ' status: ' + res.constructor.name);
    }
  };
}
