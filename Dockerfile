FROM node:8-alpine

WORKDIR /app/

COPY ./IOTDTBridgeModule/package*.json ./

RUN npm install --production

COPY ./IOTDTBridgeModule/app.js ./
COPY ./IoTDTIntegration/error.js ./
COPY ./IoTDTIntegration/lib/engine.js ./lib/

USER node

CMD ["node", "app.js"]
