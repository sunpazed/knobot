//  knobot
//  (c) 2016 Franco Trimboli
//
//  1.0

'use strict';

var config = require('config');

// --- configuration -----------------------------------------------------------
//

// --- this is the elastic search endpoint for the bot - any ES endpoint
//     can be used
//
const ELASTIC_SEARCH = config.ELASTIC_SEARCH;

// --- bot settings - should be updated if registering a new app
//
// these app details need to be defined if creating a new knobot app
// in the Slack app store
//
const CLIENT_ID = config.CLIENT_ID;
const CLIENT_SECRET = config.CLIENT_SECRET;
const BOT_URI = config.BOT_URI;

// --- requires ----------------------------------------------------------------
//

// rp for managing outbound requests to slack or es
//
var rp = require('request-promise-lite');

// we use nlp_compromise to parse the structure of articles, and search requests
//
var nlp = require('nlp_compromise');

// load the request module
//
var request = require('request');


// --- helpers -----------------------------------------------------------------
//

const utils = {


  CLIENT_ID: CLIENT_ID,
  CLIENT_SECRET: CLIENT_SECRET,
  BOT_URI: BOT_URI,

  USER_COMMANDS: {
                          'hello': 'hi',
                          'hey': 'hi',
                          'howdy': 'hi',
                          'hi': 'hi',
                          'find': 'find',
                          'search': 'find',
                          'look': 'find',
                          'ask': 'find',
                          'add': 'add',
                          'store': 'store',
                          'save': 'save',
                          'help': 'help',
                          'support': 'help',
                          'who': 'who'
                        },

  // generate a random uuid when storing an article in elastic search
  //
  genUUID: () => {
    return parseInt(Math.random().toString().substring(2,16));
  },

  // parse any new articles[] and return as slack attachments[]
  //
  parseArticle: (articles) => {
    var attachments = [];

    for (var i in articles) {
      attachments.push({
          "color": "good",
          "fallback": encodeURIComponent(articles[i].short),
          "text": encodeURIComponent(articles[i].body),
          "title": encodeURIComponent(articles[i].title),
          "author_name": `<@${articles[i].author}>`
      });

    }

    return attachments;

  },

  // search any articles in elastic search that match the query
  //
  searchArticles: (data) => {

    var team = data.team.toLowerCase();

    var message = '';

    if (data.search.indexOf(' ') > 0) {
     var q = data.search.substr(data.search.indexOf(' ') + 1);
    } else {
     var q = '';
    }

    var tokenq = utils.tokenizeText(q);

    // we return a promise here to manage the aws callback
    //
    return new Promise((resolve, reject) =>  {


     if (q.length > 0) {

         var search = encodeURI(q);

         var searchES = `${ELASTIC_SEARCH}/${team}/article/_search`

         // we search articles using the common query to weight lower against
         // common terms like stopwords
         //
         var body = {"query":
             {
               "bool": {
                    "should": [
                      {"common": { "article.body": {"query": `${search}`, "cutoff_frequency": 0.001 }}},
                      {"common": { "article.title": {"query": `${search}`, "cutoff_frequency": 0.001 }}}
                    ]}
            }
          };


         let request = new rp.Request('POST', searchES, { body: body, json: true });

         request.run().then((esData, team) => {


           // do we have any search hits?
           if (esData.hits.total > 0) {

             message = message + `Ok, found ${esData.hits.total} matching articles...\n`;
             var articles = [];


             // process each hit
             for (var item in esData.hits.hits) {

               var item = esData.hits.hits[item]['_source'];
               var author = item.author ? item.author : 'no author';
               var article = { short:item.article.body, author: author, title: item.article.title, body: item.article.body, catagory: 'foo' };
               var text = `${item.article}`;

               articles.push(article);

             }

             // ok, we have articles, lets turn them into slack attachments
             var attachments = utils.parseArticle(articles);
             return resolve({message: message, attachments: attachments});

           } else {
             message = `Nope, didn't find anything.. want to add an article? type *help*`;
             return resolve({message: message});
           }

         })
         .catch(err => {
           console.log(`error ${err}`);
           message = `Oops.. hit a problem. Try again?`;
           return resolve({message: message});
         });

     } else {
       message = `Oh, search for what you want by entering a query after "*find*", like "*find* IT Support for my laptop"`;
       return resolve({message: message});
     }


   });


  },

  // store an article in elastic search
  //
  storeArticle: (data) => {

    var user = data.user;
    var q = data.article;
    var team = data.team.toLowerCase();

    // do we have a valid article?
    if (q.indexOf(' ') > 0) {
      var article = q.substr(q.indexOf(' ') + 1);
    } else {
      var article = '';
    }

    // do we have a title?
    if ((article.indexOf(':') > 0) && (article.indexOf(':') < 50) ) {
      var body = article.substr(article.indexOf(':') + 1);
      var title = article.substr(0,article.indexOf(':'));
    } else {
      var body = article;
      var title = '';
    }

   return new Promise((resolve, reject) =>  {

      if (article.length > 0) {

            // we tokenize the text to extract stopwords, grab verbs, nouns as keywords
            var keywords = utils.tokenizeText(q);
            var recordId = utils.genUUID();
            var payload = { article: { title: title, body:body }, verified:false, trusted:0, author:user, keywords:keywords };
            var storeInES = `${ELASTIC_SEARCH}/${team}/article/${recordId}`

            let request = new rp.Request('POST', storeInES, { json: true, body: payload });

            // store this into elastic search
            request.run().then(esData => {
              //console.log(`stored ${recordId} in elastic search..`);
            })
            .catch(err => {
              console.log(`error ${err}`);
              var message = `Oops.. hit a problem. Try again?`;
              return resolve({message: message});
            });

            var message = `Ok cool.. I have stored that .. want to add another? *add* <knowledge>`;
            return resolve({message: message});


            } else {
              var message = `Oh, add anything by entering your knowledge after "*add*", like "*add* Reach out to @sam for general IT Support"`;
              return resolve({message: message});
            }

    });

  },

  // find people who know about a particular topic or search
  //
  searchExperts: (data) => {

    var team = data.team.toLowerCase();

    var message = '';

    var match = data.search.match(/who knows (.*)$/i);

    if (match) {
     var q = match[1];
    } else {
     var q = '';
    }

    var tokenq = utils.tokenizeText(q);


   return new Promise((resolve, reject) =>  {


     if (q.length > 0) {

         var search = encodeURI(q);

         var searchES = `${ELASTIC_SEARCH}/${team}/article/_search`

         var body = {"query":
             {
               "bool": {
                    "should": [
                      {"common": { "article.body": {"query": `${search}`, "cutoff_frequency": 0.001 }}},
                      {"common": { "article.title": {"query": `${search}`, "cutoff_frequency": 0.001 }}}
                    ]}
            }
          };


         let request = new rp.Request('POST', searchES, { body: body, json: true });

         request.run().then((esData, team) => {


           if (esData.hits.total > 0) {

             var experts = [];
             var textperts = '';

             for (var item in esData.hits.hits) {

                var item = esData.hits.hits[item]['_source'];

                if (item.author) {
                  experts.push(item.author);
                }

             }

             for (var i in experts) {
               textperts += `<@${experts[i]}>, `;
             }

             if (experts.length > 0) {
               var message = `Ok, have a chat to these experts; ${textperts} who know more and can help you out with that.`;

               return resolve({message: message});
             } else {
               message = `Hmm, sorry, I couldn\'t find any experts on that topic.`;
               return resolve({message: message});
             }


           } else {
             message = `Nope, didn't find anything.. sorry about that - you need more experts around here.`;
             return resolve({message: message});
           }

         })
         .catch(err => {
           console.log(`error ${err}`);
           message = `Oops.. hit a problem. Try again?`;
           return resolve({message: message});
         });

     } else {
       message = `Oh, search for who you want to find entering a query after "*who knows*", like "*who knows* IT Support for my laptop"`;
       return resolve({message: message});
     }


   });


  },

  // we use nlp compromise to process any sentences, then we parse each
  // word to extract verbs, nouns, and adjectives as keywords
  //
  tokenizeText: (q) => {

    let result = nlp.text(q).tags();

    let sentences = nlp.text(q).sentences;

    let nouns = [];
    let verbs = [];
    let adjectives = [];
    let adverbs = [];

    for (var sentence in sentences) {

      for (var item in sentences[sentence].terms) {

        var word = sentences[sentence].terms[item].normal;
        var type = sentences[sentence].terms[item].tag;

        switch (type) {
          case 'Verb':
          verbs.push(word);
          break;
          case 'Noun':
          nouns.push(word);
          break;
          case 'Adjective':
          adjectives.push(word);
          break;
          case 'Adverb':
          adverbs.push(nlp.adverb(word).to_adjective());
          break;
        }

      }

    }

    return ({nouns:nouns,verbs:verbs,adjectives:adjectives,adverbs:adverbs});

  },


  // simple method to chat.postMessage to slack
  //
  postMessage: (req) => {

    var token = req.token;
    var channel = req.channel;
    var text = req.text;
    var attachments = req.attachments;

    var postMessage = `https://slack.com/api/chat.postMessage?token=${token}&channel=${channel}&text=${text}&attachments=${attachments}`;

    return new Promise((resolve, reject) =>  {

        //let request = new rp.Request('GET', postMessage, { json: true, body: payload });
        let request = new rp.Request('GET', postMessage, { json: true });

        request.run().then(esData => {
             return resolve(esData);
        })
        .catch(err => {
             console.log(`error ${err}`);
             return resolve('error');
        });
    });

  },


  // store the teams authorised bot_token within the keystore
  //
  storeToken: (data) => {

    var token = data.token;
    var team = data.team.toLowerCase();

   return new Promise((resolve, reject) =>  {

      if (token.length > 0) {

            var payload = { token: token };
            var storeInES = `${ELASTIC_SEARCH}/knobot/token/${team}`

            let request = new rp.Request('POST', storeInES, { json: true, body: payload });

            request.run().then(esData => {
              // stored ok
              return resolve(true);
            })
            .catch(err => {
              console.log(`error ${err}`);
              // oops.. hit a problem
              return resolve(false);
            });

            } else {
              // no token
              return resolve(false);
            }

    });

  },

  // get the teams authorised bot_token within the keystore
  //
  getToken: (data) => {

    var team = data.team.toLowerCase();

    console.log('team is', team);

   return new Promise((resolve, reject) =>  {

      if (team.length > 0) {

            var getInES = `${ELASTIC_SEARCH}/knobot/token/${team}`;

            let request = new rp.Request('GET', getInES, { json: true });

            request.run().then(esData => {
              console.log('got token', esData);
              return resolve(esData['_source']['token']);

            })
            .catch(err => {
              console.log(`error ${err}`);
              // oops.. hit a problem
              return resolve(false);
            });

            } else {
              // no team
              return resolve(false);
            }

    });

  },

  // helper function to check if the recieved message is a DM or not
  //
  isDirect: (channel) => {
      return !channel.indexOf('D');
  },

  // helper function to render an HTML template response
  //
  renderTemplate: (props) => {
      return [
        '<!DOCTYPE html><html><head><title></title>',
        '<link href="https://fonts.googleapis.com/css?family=Raleway:300,400,600,700,800" rel="stylesheet"></head>',
        '<body><style>*{margin: 0; padding: 0;}body{color: #3f0df7; font-size: 20px; background-color: white; overflow: hidden; font-family: "Raleway", sans-serif;}.flex{height: 100vh; display: flex; align-items: center; justify-content: center;flex-direction: column;}.flex-item{clear: both; max-width: 100%;}.text-center{text-align: center;}#install{font-weight: 600; color: #3f0df7; display: block; margin: 30px; font-size: 30px; padding: 0.5em; border: 1px solid #3f0df7; text-decoration: none; border-radius: 8px; box-shadow: 0 2px 2px 0 rgba(48,48,58,.1),0 4px 3px 0 rgba(0,0,0,.2);}</style>',
        '<div class="flex"> <div class="flex-item text-center ">',
        `<p>${props.message}</p>`,
        `</div><div class="flex-item text-center"><a id="install" href="${props.url}">${props.action}</a>`,
        '</div></div></body></html>'
      ].join('');
  }


}

module.exports = utils;
