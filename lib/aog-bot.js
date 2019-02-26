'use strict';
/*
 * Botmaster integration for Actions On Google.
 *
 * Written by Chyuibacca.
 */
const { BaseBot } = require('botmaster');
const debug = require('debug')('botmaster:aog');
const express = require('express');
const bodyParser = require('body-parser');
const _get = require('lodash.get');
const _set = require('lodash.set');
const { actionssdk } = require('actions-on-google');


class ActionsOnGoogleBot extends BaseBot {

    /**
     * Constructs a new instance with the specified settings
     * @param {object} settings Settings object to be applied to the instance
     */
    constructor(settings) {
        super(settings);
        
        //Set the static bot type settings
        this.type = 'actions-on-google';
        this.receives = {
            text: true
        };
        this.sends = {
            text: true
        };

        //Apply the settings to the bot instance
        this.__validateSettings(settings);
        this.__applySettings(settings);

        //Create the AoG action handler
        this.convCache = {};
        this.aogApp = this.__setupActionsApp(settings);
        this.expressApp = this.__setupAppServer(this.aogApp, settings);
        //Set the request listener
        this.requestListener = this.expressApp;
    }


    /**
     * @ignore
     * Validates the bot settings
     * @param {object} settings The bot settings to be applied
     * @throws {Error} If settings are invalid
     */
    __validateSettings(settings) {
        //Need an Express app or a port (to create one)
        if (settings.expressApp===undefined && settings.port===undefined) {
            throw new Error(`Bots of type ${this.type} must be defined with an 'expressApp' or 'port' in their settings`);
        }
        //Actions on Google project id
        if (settings.actionId===undefined || typeof settings.actionId!=='string') {
            throw new Error(`Bots of type ${this.type} must be defined with an string 'actionId' in their settings`);
        }
        //Actions on Google account linking client id
        if (settings.clientId!==undefined && typeof settings.clientId!=='string') {
            throw new Error(`Bots of type ${this.type} should be defined with a string 'clientId' in their settings`);
        }
        //Default error response message
        if (settings.errorMessage!==undefined && typeof settings.errorMessage!=='string') {
            throw new Error(`Bots of type ${this.type} should be defined with a string 'errorMessage' in their settings`);
        }
    }


    /**
     * @ignore
     * Applies the specified settings to the bot
     * @param {object} settings The bot settings to be applied
     */
    __applySettings(settings) {
        super.__applySettings(settings);
        this.id = settings.id || this.type; //The bot id
        this.port = settings.port; //Port to listen on
        this.debug = settings.debug; //Actions on Google debug option
        this.actionId = settings.actionId; //The Actions on Google project identifier
        this.clientId = settings.clientId; //Google account linking Client ID (see https://developers.google.com/actions/identity/oauth2)
        this.errorMessage = settings.errorMessage; //Default error response message
    }


    /**
     * @ignore
     * Setup (or create) the web app to handle requests
     * @param {ActionsSdkApp} aogApp Actions on Google app
     * @param {object} settings The bot settings to be applied
     */
    __setupAppServer(aogApp, settings) {
        let expressApp = settings.expressApp;
        //Set (or create) the express app
        if (expressApp===undefined) {
            //Create the express app
            expressApp = express().use(bodyParser.json());
            //Start the server
            this.server = expressApp.listen(this.port, '0.0.0.0', () => {
                debug(`${this.type} bot listening for requests on port ${this.port}`);
            });
        }
        //Add the handler method route
        expressApp.post(`/${this.id}/fulfillment`, aogApp);
        //Return the configured express app
        return expressApp;
    }


    /**
     * @ignore
     * Create and setup the Actions on Google handler app
     * @param {object} settings The bot settings to be applied
     */
    __setupActionsApp(settings) {
        //Create the handler function
        let bot = this;
        let handleIntent = async function(conv, input) {
            debug(`Processing ${conv.intent} intent: ${JSON.stringify(input)}`);
            //Get the turn count for the conversation
            let turn = ActionsOnGoogleBot.getConvTurn(conv);
            if (turn!=undefined) { turn+=1; } else { turn = 0;}
            ActionsOnGoogleBot.setConvTurn(conv, turn);
            //Cache the conversation object
            bot.convCache[ActionsOnGoogleBot.getConvMessageId(conv)] = conv;
            //Process the conversation turn
            try {
                let update = await bot.__formatUpdate(conv);
                debug(`Emitting update for ${_get(update, 'message.mid')}: ${JSON.stringify(update)}`);
                let result = await bot.__emitUpdate(update);
            } catch(err) {
                err.message = `${err.name||'Error'} in __formatUpdate "${err.message}". Please report this.`;
                conv.ask(`I'm sorry, I can't help at the moment. Please try again later`);
            } finally {
                //Delete the cached conversation object
                delete bot.convCache[ActionsOnGoogleBot.getConvMessageId(conv)];
                debug(`Conversation cache has ${Object.keys(bot.convCache).length} entries`);
            }
        };
        //Create the error handler function
        let handleError = function (conv, error) {
            console.error(`${error.name||'Error'} processing ${conv.intent} intent: ${JSON.stringify(error.message)}`);
            conv.ask('I\'m sorry, I am unable to respond at the moment');
            //Delete the cached conversation object
            delete bot.convCache[ActionsOnGoogleBot.getConvMessageId(conv)];
        }
        //Create the AoG app
        let aogApp = actionssdk({ verification: this.actionId, clientId: this.clientId, debug: this.debug });
        aogApp.intent('actions.intent.MAIN', handleIntent);
        aogApp.fallback(handleIntent);
        aogApp.catch(handleError);
        //Return the AoG app
        return aogApp;
    }


    /**
     * Returns the identifier for the specified conversation.
     * @param {object} conv The Actions on Google conversation
     * @returns {string} Conversation identifier
     */
    static getConvId(conv) {
        return _get(conv, 'id');
    }

    /**
     * Returns the turn count for the specified conversation.
     * @param {object} conv The Actions on Google conversation
     * @returns {number} The turn count (or undefined if not available)
     */
    static getConvTurn(conv) {
        return _get(conv, 'data.turn');
    }

    /**
     * Sets the turn count in the specified conversation.
     * @param {object} conv The Actions on Google conversation
     * @param {number} turn The turn count to be set
     */
    static setConvTurn(conv, turn) {
        if (turn) {
            _set(conv, 'data.turn', turn);
        }
    }

    /**
     * Returns the message identifier for the specified conversation.
     * @param {object} conv The Actions on Google conversation
     * @returns {string} The message identifier
     */
    static getConvMessageId(conv) {
        return ActionsOnGoogleBot.getConvId(conv)+':'+ActionsOnGoogleBot.getConvTurn(conv);
    }


    /**
     * Formats the specified request body into a Botmaster update.
     * @param {object} conv The Actions on Google conversation
     * @returns {Promise} A Promise resolving to the formatted update object
     */
    __formatUpdate(conv) {
        return new Promise((resolve, reject) => {
            let update = {
                raw: conv,
                sender: {
                    id: ActionsOnGoogleBot.getConvId(conv)
                },
                recipient: {
                    id: this.id
                },
                timestamp: Date.now(),
                message: {
                    mid: ActionsOnGoogleBot.getConvMessageId(conv),
                    seq: ActionsOnGoogleBot.getConvTurn(conv),
                    text: _get(conv, 'request.inputs[0].rawInputs.query', '')
                }
            };
            resolve(update);
        });
    }


    /**
     * @ignore
     * Formats the specified outgoing Botmaster message for sending as the request response
     * @param {object} outgoingMessage The outgoing message to be formatted
     * @returns {Promise} A Promise resolving to the formatted outgoing message object
     */
    __formatOutgoingMessage(outgoingMessage) {
        return new Promise((resolve, reject) => {
            let formattedMessage = {
                response: _get(outgoingMessage, 'message.text')
            };
            resolve(formattedMessage);
        });
    }


    /**
     * @ignore
     * Sends the formatted outgoing response.
     * @param {object} formattedMessage The formatted outgoing message to be sent
     * @param {object} sendOptions Options for sending the message. Required options are: mid
     * @returns {Promise} A Promise resolving to the formatted outgoing message
     */
    __sendMessage(formattedMessage, sendOptions) {
        let senderId = _get(sendOptions, 'mid');
        let response = _get(formattedMessage, 'response');
        debug(`Sending message for ${senderId}: ${JSON.stringify(response)}`);
        return new Promise((resolve, reject) => {
            //Get conversation object
            let conv = this.convCache[senderId];
            //Send the response
            if (response!=undefined) {
                conv.ask(response);
            }
            resolve({ mid: senderId, response: response });
        });
    }


    /**
     * @ignore
     * Create the standard body response components, including the recipient and message identifier.
     * @param {OutgoingMessage} sentOutgoingMessage The OutgoingMessage object before formatting
     * @param {object} sentRawMessage The raw message that was actually sent to the platform after __formatOutgoingMessage was called
     * @param {object} raw the raw body response from the platform
     * @return {Promise} Promise that resolves in an object that contains both the recipient_id and message_id fields
     */
    __createStandardBodyResponseComponents(sentOutgoingMessage, sentRawMessage, raw) {
        let mid = _get(raw, 'mid');
        let bodyResponse = {
            recipient_id: _get(sentOutgoingMessage, 'recipient.id'),
            message_id: mid
        };
        debug(`Returning standard body responses for ${mid}: ${JSON.stringify(bodyResponse)}`);
        return Promise.resolve(bodyResponse);
    }
}

module.exports = ActionsOnGoogleBot;