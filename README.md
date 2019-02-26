# botmaster-aog
Actions on Google integration for the [Botmaster](https://github.com/botmasterai/botmaster) chatbot framework.

## Installation
Install the Botmaster AoG package:
- Yarn: `yarn add botmaster-aog`

- NPM:  `npm install --save botmaster-aog`


## Usage
To use the Actions on Google integration, add it to your Botmaster application as follows:
```javascript
const ActionsOnGoogleBot = require('botmaster-aog');
const aogSettings = {
    port: 8080,
    actionId: '<Actions on Google project ID'
};
const aogBot = new ActionsOnGoogleBot(aogSettings);
botmaster.addBot(aogBot);
```


## Options
The Actions on Google bot integration supports the following options:

| Option | Type | Description | Default |
|--------|------|-------------|---------|
| id | string | Bot identifier | `actions-on-google` |
| actionId | string | The Actions on Google project identifier | |
| clientId | string | Actions on Google account linking client id | |
| debug | boolean | Actions on Google debug logging | `false` |
| errorMessage | string | Default error message | |
| port | string | Port to start the new webhook server on | |
| expressApp | object | Existing [Express](http://expressjs.com/) app to mount the webhook on | |

Note: Either the `expressApp` or `port` option must be specified. If an [Express](http://expressjs.com/) app is specified, the webhook is mounted on the existing app. Otherwise, a new [Express](http://expressjs.com/) app is created and started on the specified port.


## Webhook Endpoint
The Actions on Fulfillment webhook is mounted at:

```
GET /<id>/fulfilment
```

If no `id` is specified in the options list, the webhook will default to:
```
GET /actions-on-google/fulfillment
```

## Intents
The Actions on Google bot handles the following intents:

- actions.intent.MAIN
- FALLBACK

The user utterance (text) is formatted and emitted as a Botmaster update.