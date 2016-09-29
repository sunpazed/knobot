//  knobot
//  (c) 2016 Franco Trimboli
//
//  1.0


// --- configuration -----------------------------------------------------------
//
// global configuration variables here
var config = {};

// --- this is the elastic search endpoint for the bot - any ES endpoint
//     can be used
//
config.ELASTIC_SEARCH = 'http://xxxxxxxxxxxxxxxxx.us-east-1.es.amazonaws.com';


// --- bot settings - should be updated if registering a new app
//
// these app details need to be defined if creating a new knobot app
// in the Slack app store
//
config.CLIENT_ID = 'xxxxxxxxxxxxxxxxx.xxxxxxxxxxxxxxxxx';
config.CLIENT_SECRET = 'xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx';
config.BOT_URI = 'https://xxxxxxxxxxxxxxxxxxx.amazonaws.com/prod/auth';

module.exports = config;
