//  knobot
//  (c) 2016 Franco Trimboli
//
//  1.0

'use strict';

var knobot = require('knobot-utils');
var request = require('request');
var rp = require('request-promise');


// --- auth --------------------------------------------------------------------
//

// --- handles the code request for oauth, and renders the success page
//
module.exports.auth = (event, context, callback) => {

  // let's attempt to grab the code as passed through via Slack when authing an App
  var code = event.query.code;
  console.log('code is', code);

  // form the expected return object for Slack to validate the App
  var body = {
    client_id: knobot.CLIENT_ID,
    client_secret: knobot.CLIENT_SECRET,
    code: code,
    redirect_uri: knobot.BOT_URI
  };

  console.log('body is',body);


  // Slack oAuth endpoint
  var url = 'https://slack.com/api/oauth.access';

  var options = { uri: url,
                  method: 'POST',
                  body: body,
                  json: true
                  };

      var htmlTemplate;

      request({
          url: url,
          qs: body,
          method: 'POST',
          json: body
      }, function(error, response, body){
          if(error) {
              context.done(null,'Ooops. hit a problem..');
          } else {

            console.log(response.body);

            var team = (response.body.team_id).toLowerCase();
            var token = response.body.bot.bot_access_token;
            var botuser = response.body.bot.bot_user_id;

            knobot.storeToken({team: team, token: token }).then(result => {
              htmlTemplate = knobot.renderTemplate( {message: 'Installed! It\'s easy to get started, just privately chat to @knobot in your Slack team.', action: 'Chat to @knobot', url: `slack://channel?id=${botuser}`} );
              context.succeed(htmlTemplate);
            });

          }
      });


}


// --- eventendpoint -----------------------------------------------------------
//

// --- handles the code challenge request, and is the core endpoint to the
//     slack events API
//
module.exports.eventendpoint = (ev, context, callback) => {

      console.log('body',ev);

      // are we processing a challenge-request on registration?
      if ('challenge' in ev.body)  {

        context.succeed({
          "token": "nbAYdOoGOghc6FW5QqZbS18I",
          "challenge": ev.body.challenge,
          "type": "url_verification"
        });

      // ok, looks like we're processing a user request
      } else {

        // grab some useful details in the request
        var team_id = ev.body.team_id;
        var channel_id = ev.body.event.channel;
        var user = ev.body.event.user;
        var text = ev.body.event.text;
        var type = ev.body.event.type;


        // fetch the auth token for the team
        knobot.getToken({team: team_id}).then(token => {


                // do we have a valid (direct) message, or a bot message?
                if ( (ev.body.event.type === 'message') && (ev.body.event.subtype != 'bot_message') && (typeof(text) === 'string') && (knobot.isDirect(ev.body.event.channel)) ) {

                  // get the current command, which is the first token in the string
                  var command = (text.split(' ')[0]).toLowerCase();
                  console.log(`user said ${command}...`);

                  // compare with the commands we have stored in knobot, do any match?
                  switch (knobot.USER_COMMANDS[command]) {


                    // user said "hi" ------------------------------------------------------
                    //
                    case 'hi':
                        var message = 'Hi there. I\'m *knobot*, and I\'m your new knowledge bot. Type *help* to get started.';

                        knobot.postMessage({ token: token, channel: channel_id, text: message }).then(postMsgResp => {
                          context.succeed(postMsgResp);
                        }).catch(err => {
                          console.log(err);
                          context.succeed();
                        });

                    break;


                    // user said "help" ----------------------------------------------------
                    //
                    case 'help':
                        var message = `I collect knowledge from experts in your team, and help you search for it - all here in Slack! It\'s as simple as chatting to me.\nYou can add and search for knowledge from your organisation as follows:\n\n`;

                        var attachments = [
                            {
                              "color": "#e9a820",
                              "title": "Adding knowledge",
                              "text": `Store useful knowledge after the "add" command, as follows:\n"Add <title/category>: <article>", here's an example\n"Add IT Support: If you need IT Support for any of your equipment, reach out to @fred"`,
                            },
                            {
                              "color": "#e01563",
                              "title": "Searching for knowledge",
                              "text": `Search by entering a query after the "find" command, as follows:\n"Find IT Support for my laptop"`,
                            },
                            {
                              "color": "#3eb991",
                              "title": "Finding an expert",
                              "text": `Find someone "who knows" about a topic by entering a query, as follows:\n"Who knows IT Support"`,
                            },
                            ,
                            {
                              "title": "Pro-tip",
                              "text": `When adding knowledge, it\'s useful to add a title to it, like this "add <title>: <details>"`,
                            },
                        ];

                        knobot.postMessage({ token: token, channel: channel_id, text: encodeURIComponent(message), attachments: encodeURIComponent(JSON.stringify(attachments)) }).then(postMsgResp => {
                          context.succeed(postMsgResp);
                        }).catch(err => {
                          console.log(err);
                          context.succeed();
                        });

                    break;


                    // user said "find" ----------------------------------------------------
                    //
                    case 'find':
                        knobot.searchArticles({search: text, team: team_id, user: user}).then((messageData) => {

                          var message = encodeURI(messageData.message);
                          knobot.postMessage({ token: token, channel: channel_id, text: message, attachments: JSON.stringify(messageData.attachments) }).then(postMsgResp => {
                            context.succeed(postMsgResp);
                          }).catch(err => {
                            console.log(err);
                            context.succeed();
                          });


                        })
                        .catch(err => {

                          var text = 'Oops.. looks like I hit my head. These things happen. Try again...';
                          knobot.postMessage({ token: token, channel: channel_id, text: text }).then(postMsgResp => {
                            context.succeed(postMsgResp);
                          }).catch(err => {
                            console.log(err);
                            context.succeed();
                          });

                        });
                    break;


                    // user said "add" -----------------------------------------------------
                    //
                    case 'add':
                        knobot.storeArticle({article: text, team: team_id, user: user}).then((messageData) => {

                          var message = encodeURI(messageData.message);
                          knobot.postMessage({ token: token, channel: channel_id, text: message }).then(postMsgResp => {
                            context.succeed(postMsgResp);
                          }).catch(err => {
                            console.log(err);
                            context.succeed();
                          });

                        })
                        .catch(err => {

                          var text = 'Oops.. looks like I hit my head. These things happen. Try again...';
                          knobot.postMessage({ token: token, channel: channel_id, text: text }).then(postMsgResp => {
                            context.succeed(postMsgResp);
                          }).catch(err => {
                            console.log(err);
                            context.succeed();
                          });

                        });
                    break;


                    // user said "who" ----------------------------------------------------
                    //
                    case 'who':
                        knobot.searchExperts({search: text, team: team_id, user: user}).then((messageData) => {

                          var message = encodeURI(messageData.message);
                          knobot.postMessage({ token: token, channel: channel_id, text: message, attachments: JSON.stringify(messageData.attachments) }).then(postMsgResp => {
                            context.succeed(postMsgResp);
                          }).catch(err => {
                            console.log(err);
                            context.succeed();
                          });

                        })
                        .catch(err => {

                          var knobot = 'Oops.. looks like I hit my head. These things happen. Try again...';
                          knobot.postMessage({ token: token, channel: channel_id, text: text }).then(postMsgResp => {
                            context.succeed(postMsgResp);
                          }).catch(err => {
                            console.log(err);
                            context.succeed();
                          });

                        });
                    break;


                    // default options -----------------------------------------------------
                    //
                    default:
                      var message = 'Nope, that didn\'t make much sense to me. I\'m only a bot after all. Type *help* to find out more.';
                      knobot.postMessage({ token: token, channel: channel_id, text: message }).then(postMsgResp => {
                        context.succeed(postMsgResp);
                      }).catch(err => {
                        console.log(err);
                        context.succeed();
                      });
                    break;

                  }


                }


        });



      }

}


// -- debug endpoint
//
module.exports.knobot = (event, context, cb) => cb(null,
  'head to knobot.figure.ai to install me!'
);
