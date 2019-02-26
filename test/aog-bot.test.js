/*
 * Tests for the Actions on Google bot class (/lib/aog-bot.js)
 */

const mockExpress = function() {
    let app = {};
    app.post = jest.fn((path, handler) => { return app });
    app.use = jest.fn(middleware => { return app });
    app.listen = jest.fn((port, address, callback) => { return app });
    return app;
}

describe('aog-bot', () => {
    let ActionsOnGoogleBot;
    let thrown;

    beforeEach(() => {
        ActionsOnGoogleBot = require('../lib/aog-bot');
        ActionsOnGoogleBot.__set__('express', mockExpress);
        thrown = undefined;
    })

    /* Test the settings validation function */
    describe('#constructor', () => {
        test('should throw error if no expressApp or port specified', async () => {
            try {
                let bot = new ActionsOnGoogleBot({});
            } catch(err) {
                thrown = err;
            }
            expect(thrown).toBeDefined();
            expect(thrown.message).toContain(`must be defined with an 'expressApp' or 'port'`);
        });
        test('should throw error if non-string actionId specified', async () => {
            try {
                let bot = new ActionsOnGoogleBot({ port: 8080, actionId: {} });
            } catch(err) {
                thrown = err;
            }
            expect(thrown).toBeDefined();
            expect(thrown.message).toContain(`must be defined with an string 'actionId'`);
        });
        test('should throw error if non-string clientId specified', async () => {
            try {
                let bot = new ActionsOnGoogleBot({ port: 8080, actionId: 'MyAction', clientId: {} });
            } catch(err) {
                thrown = err;
            }
            expect(thrown).toBeDefined();
            expect(thrown.message).toContain(`should be defined with a string 'clientId'`);
        });
        test('should throw error if non-string errorMessage specified', async () => {
            try {
                let bot = new ActionsOnGoogleBot({ port: 8080, actionId: 'MyAction', errorMessage: {} });
            } catch(err) {
                thrown = err;
            }
            expect(thrown).toBeDefined();
            expect(thrown.message).toContain(`should be defined with a string 'errorMessage'`);
        });
        test('should throw error if non-string errorMessage specified', async () => {
            try {
                let bot = new ActionsOnGoogleBot({ port: 8080, actionId: 'MyAction', errorMessage: {} });
            } catch(err) {
                thrown = err;
            }
            expect(thrown).toBeDefined();
            expect(thrown.message).toContain(`should be defined with a string 'errorMessage'`);
        });
        test('should create a new instance with the specified settings', () => {
            let settings = { id: 'MyBot', port: 8888, debug: true, actionId: 'MyAction', clientId: 'MyClient', errorMessage: 'My error message' };
            let bot = new ActionsOnGoogleBot(settings);
            expect(bot).toBeDefined();
            expect(bot.type).toBe('actions-on-google');
            expect(bot.receives).toEqual({ text: true });
            expect(bot.sends).toEqual({ text: true });
            expect(bot.id).toBe(settings.id);
            expect(bot.debug).toBe(settings.debug);
            expect(bot.actionId).toBe(settings.actionId);
            expect(bot.clientId).toBe(settings.clientId);
            expect(bot.errorMessage).toBe(settings.errorMessage);
            expect(bot.port).toBe(settings.port);
            expect(bot.convCache).toEqual({});
            expect(bot.aogApp).toBeDefined();
            expect(bot.expressApp).toBeDefined();
            expect(bot.expressApp.listen.mock.calls.length).toBe(1);
            expect(bot.expressApp.post.mock.calls.length).toBe(1);
            expect(bot.server).toBeDefined();
            expect(bot.requestListener).toEqual(bot.expressApp);
        });
        test('should create a new instance with the specified settings and express app', () => {
            let mockedExpress = mockExpress();
            let settings = { id: 'MyBot', expressApp: mockedExpress, debug: true, actionId: 'MyAction', clientId: 'MyClient', errorMessage: 'My error message' };
            let bot = new ActionsOnGoogleBot(settings);
            expect(bot).toBeDefined();
            expect(bot.type).toBe('actions-on-google');
            expect(bot.receives).toEqual({ text: true });
            expect(bot.sends).toEqual({ text: true });
            expect(bot.id).toBe(settings.id);
            expect(bot.debug).toBe(settings.debug);
            expect(bot.actionId).toBe(settings.actionId);
            expect(bot.clientId).toBe(settings.clientId);
            expect(bot.convCache).toEqual({});
            expect(bot.errorMessage).toBe(settings.errorMessage);
            expect(bot.aogApp).toBeDefined();
            expect(bot.expressApp).toBeDefined();
            expect(mockedExpress.post.mock.calls.length).toBe(1);
            expect(bot.requestListener).toEqual(bot.expressApp);
        });
    });

    /* Test the static conversation identifier retrieval function */
    describe('#getConvId', () => {
        test('should not throw if no conversation', async () => {
            let result;
            try {
                result = ActionsOnGoogleBot.getConvId(undefined);
            } catch(err) {
                thrown = err;
            }
            expect(thrown).toBeUndefined();
            expect(result).toBeUndefined();
        });
        test('should not throw if no identifier in conversation', async () => {
            let result;
            try {
                result = ActionsOnGoogleBot.getConvId({});
            } catch(err) {
                thrown = err;
            }
            expect(thrown).toBeUndefined();
            expect(result).toBeUndefined();
        });
        test('should return conversation id', async () => {
            let result;
            try {
                result = ActionsOnGoogleBot.getConvId({ id: '1234567890' });
            } catch(err) {
                thrown = err;
            }
            expect(thrown).toBeUndefined();
            expect(result).toBe('1234567890');
        });
    });

    /* Test the static conversation turn retrieval function */
    describe('#getConvTurn', () => {
        test('should not throw if no conversation', async () => {
            let result;
            try {
                result = ActionsOnGoogleBot.getConvTurn(undefined);
            } catch(err) {
                thrown = err;
            }
            expect(thrown).toBeUndefined();
            expect(result).toBeUndefined();
        });
        test('should not throw if no turn in conversation', async () => {
            let result;
            try {
                result = ActionsOnGoogleBot.getConvTurn({});
            } catch(err) {
                thrown = err;
            }
            expect(thrown).toBeUndefined();
            expect(result).toBeUndefined();
        });
        test('should return conversation turn', async () => {
            let result;
            try {
                result = ActionsOnGoogleBot.getConvTurn({ data: { turn: 99 } });
            } catch(err) {
                thrown = err;
            }
            expect(thrown).toBeUndefined();
            expect(result).toBe(99);
        });
    });

    /* Test the static conversation turn setting function */
    describe('#setConvTurn', () => {
        test('should not throw if no conversation or turn', async () => {
            try {
                ActionsOnGoogleBot.setConvTurn(undefined, undefined);
            } catch(err) {
                thrown = err;
            }
            expect(thrown).toBeUndefined();
        });
        test('should not throw if conversation but no turn', async () => {
            let conv = {};
            try {
                ActionsOnGoogleBot.setConvTurn(conv, undefined);
            } catch(err) {
                thrown = err;
            }
            expect(thrown).toBeUndefined();
            expect(conv).toEqual({});
        });
        test('should not throw if turn but no conversation', async () => {
            try {
                ActionsOnGoogleBot.setConvTurn(undefined, 99);
            } catch(err) {
                thrown = err;
            }
            expect(thrown).toBeUndefined();
        });
        test('should set conversation turn', async () => {
            let conv = {};
            try {
                ActionsOnGoogleBot.setConvTurn(conv, 99);
            } catch(err) {
                thrown = err;
            }
            expect(thrown).toBeUndefined();
            expect(conv.data).toBeDefined();
            expect(conv.data.turn).toBe(99);
        });
    });

    /* Test the static conversation message identifier retrieval function */
    describe('#getConvMessageId', () => {
        test('should not throw if no conversation', async () => {
            let result;
            try {
                result = ActionsOnGoogleBot.getConvMessageId(undefined);
            } catch(err) {
                thrown = err;
            }
            expect(thrown).toBeUndefined();
            expect(result).toBe('undefined:undefined');
        });
        test('should return conversation message identifier', async () => {
            let conv = { id: 'ABCDEFGH', data: { turn: 123 } };
            try {
                result = ActionsOnGoogleBot.getConvMessageId(conv);
            } catch(err) {
                thrown = err;
            }
            expect(thrown).toBeUndefined();
            expect(result).toBe(conv.id+':'+conv.data.turn);
        });
    });

    /* Test the update formatter function */
    describe('#__formatUpdate', () => {
        let bot;
        beforeEach(() => {
            let mockedExpress = mockExpress();
            let settings = { id: 'MyBot', expressApp: mockedExpress, debug: true, actionId: 'MyAction'};
            bot = new ActionsOnGoogleBot(settings);
        });

        test('should return basic update if no conversation', async () => {
            let result;
            try {
                result = await bot.__formatUpdate(undefined);
            } catch(err) {
                thrown = err;
            }
            expect(thrown).toBeUndefined();
            expect(result).toBeDefined();
            expect(result.message).toEqual({ "mid": "undefined:undefined", "seq": undefined, "text": "" } );
            expect(result.raw).toBeUndefined();
            expect(result.recipient).toEqual( {"id": "MyBot"} );
            expect(result.sender).toEqual( {id: undefined} );
            expect(result.timestamp).toBeDefined();
        });
        test('should return formatted update from conversation', async () => {
            let conv = { id: 'ABCDEFGH', data: { turn: 99 }, request: {inputs: [{ rawInputs: {query: 'Some query' } }] } };
            let result;
            try {
                result = await bot.__formatUpdate(conv);
            } catch(err) {
                thrown = err;
            }
            expect(thrown).toBeUndefined();
            expect(result).toBeDefined();
            expect(result.message).toEqual({ mid: conv.id+':'+conv.data.turn, seq: conv.data.turn, text: 'Some query' } );
            expect(result.raw).toEqual(conv);
            expect(result.recipient).toEqual( { id: 'MyBot' } );
            expect(result.sender).toEqual( { id: conv.id } );
            expect(result.timestamp).toBeDefined();
        });
    });

    /* Test the outgoing message formatter function */
    describe('#__formatOutgoingMessage', () => {
        let bot;
        beforeEach(() => {
            let mockedExpress = mockExpress();
            let settings = { id: 'MyBot', expressApp: mockedExpress, debug: true, actionId: 'MyAction'};
            bot = new ActionsOnGoogleBot(settings);
        });

        test('should return basic outgoing message if no message', async () => {
            let result;
            try {
                result = await bot.__formatOutgoingMessage(undefined);
            } catch(err) {
                thrown = err;
            }
            expect(thrown).toBeUndefined();
            expect(result).toEqual({ response: undefined });
        });
        test('should return formatted update from conversation', async () => {
            let outgoingMsg = { message: { text: 'Outgoing message' } };
            let result;
            try {
                result = await bot.__formatOutgoingMessage(outgoingMsg);
            } catch(err) {
                thrown = err;
            }
            expect(thrown).toBeUndefined();
            expect(result).toBeDefined();
            expect(result.response).toEqual(outgoingMsg.message.text);
        });
    });

    /* Test the send outgoing message function */
    describe('#__sendMessage', () => {
        let bot, conv = { ask: jest.fn(response => {} ) }, mid = 'ABCD1234';
        beforeEach(() => {
            let mockedExpress = mockExpress();
            let settings = { id: 'MyBot', expressApp: mockedExpress, debug: true, actionId: 'MyAction'};
            bot = new ActionsOnGoogleBot(settings);
            bot.convCache[mid] = conv;
        });
        test('should not throw if no message and send options', async () => {
            let result;
            try {
                result = await bot.__sendMessage(undefined, undefined);
            } catch(err) {
                thrown = err;
            }
            expect(thrown).toBeUndefined();
            expect(result).toEqual({ mid: undefined, response: undefined });
        });
        test('should send the response', async () => {
            let result,
                outMessage = { response: 'Some text' },
                sendOptions = { mid: mid };
            try {
                result = await bot.__sendMessage(outMessage, sendOptions);
            } catch(err) {
                thrown = err;
            }
            expect(thrown).toBeUndefined();
            expect(result).toEqual({ mid: mid, response: outMessage.response });
            expect(conv.ask.mock.calls.length).toBe(1);
            expect(conv.ask.mock.calls[0][0]).toBe('Some text');
        });
    });

    /* Test the create standard body response function */
    describe('#__createStandardBodyResponseComponents', () => {
        let bot, conv = { ask: jest.fn(response => {} ) }, mid = 'ABCD1234';
        beforeEach(() => {
            let mockedExpress = mockExpress();
            let settings = { id: 'MyBot', expressApp: mockedExpress, debug: true, actionId: 'MyAction'};
            bot = new ActionsOnGoogleBot(settings);
            bot.convCache[mid] = conv;
        });
        test('should not throw if no message and raw update', async () => {
            let result;
            try {
                result = await bot.__createStandardBodyResponseComponents(undefined, undefined, undefined);
            } catch(err) {
                thrown = err;
            }
            expect(thrown).toBeUndefined();
            expect(result).toEqual({ recipient_id: undefined, message_id: undefined });
        });
        test('should return the standard body response components', async () => {
            let result,
                sentOutgoingMessage = { recipient: { id: 'MyRecipient' } },
                raw = { mid: mid };
            try {
                result = await bot.__createStandardBodyResponseComponents(sentOutgoingMessage, undefined, raw);
            } catch(err) {
                thrown = err;
            }
            expect(thrown).toBeUndefined();
            expect(result).toEqual({ recipient_id: sentOutgoingMessage.recipient.id, message_id: raw.mid });
        });
    });
});
