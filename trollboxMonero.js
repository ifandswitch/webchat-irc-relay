// Poloniex Trollbox IRC Relay with filter
const irc = require('irc');
const WebSocket = require('ws');
const ent = require('ent');

// set it up
const config = {
  network: 'irc.freenode.net',
  channelName: '##testbox',
  botName: 'TROLLBOX',
  captureDuration: 60 * 1000, // 60 seconds in milis
  wsuri: 'wss://api2.poloniex.com',
  useFilters: true,
  trollboxChannelId: 1001
};

// filter strings (always lowercase)
const keywords = ['monero', 'xmr', 'moonero'];
const nicks = [
  'fluffypony',
  'needmoney90',
  'rptiela',
  'fluffy',
  'spagni',
  'reptil'
];

// configure irc client
const client = new irc.Client(config.network, config.botName, {
  userName: config.botName,
  realName: 'Poloniex Trollbox IRC Relay',
  port: 6667,
  debug: false,
  autoRejoin: true,
  channels: [config.channelName]
});

// create the socket
const socket = new WebSocket('wss://api2.poloniex.com');

// log errors from irc
client.addListener('error', message => {
  // console.log('IRC Error:', message);
});

// on open, subscribe to trollbox channel
socket.on('open', data => {
  console.log('Websocket connected.');
  const params = { command: 'subscribe', channel: config.trollboxChannelId };
  socket.send(JSON.stringify(params));
});

// listen for messages
socket.on('message', messageReceived);

/**
 * Handle socket message
 *
 * message format:
 *
 *  [1001,18378337,"Banhammer","copharion banned for 1 days, 0 hours, and 0 minutes by TheDjentleman.",0]
 *  [channelId, timestamp, username, message, points]
 */
function messageReceived(data) {
  try {
    data = JSON.parse(data);
    switch (data[0]) {
      case config.trollboxChannelId:
        const nick = data[2];
        const msg = ent.decode(data[3]);
        if (shouldCaptureMessage(nick, msg)) {
          say(nick, msg);
        }
        break;
    }
  } catch (e) {
    // console.log('Failed to parse socket data', data);
  }
}

/**
 * Check if we should say it
 */
function shouldCaptureMessage(nick, msg) {
  var shouldCapture = false;
  nick = nick.toLowerCase();
  msg = msg.toLowerCase();

  // skip if filtering is off
  if (!config.useFilters) return true;

  // check for keywords
  keywords.forEach(capture => {
    if (msg.indexOf(capture) != -1 || nick === capture) {
      nicks.push(nick);
      setTimeout(() => {
        nicks.splice(nicks.indexOf(nick), 1);
      }, config.captureDuration);
      shouldCapture = true;
    }
  });

  // check for user nicks
  nicks.forEach(capture => {
    if (msg.indexOf(capture) != -1 || nick === capture) {
      shouldCapture = true;
    }
  });

  return shouldCapture;
}

/**
 * Send the message to IRC
 */
function say(nick, msg) {
  client.say(config.channelName, '-> ' + nick + ': ' + msg);
}
