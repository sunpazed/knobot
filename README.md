[![ScreenShot](http://figure.ai/media/say-hello.png)](https://youtu.be/qw0reRmMn-k)

# Knobot

### Knobot is a serverless slackbot built with one purpose, to bring together your teams expertise and knowledge, right where you work - in Slack!

#### [Watch the video](https://youtu.be/qw0reRmMn-k)

Knobot powers your collective knowledge - capturing, finding and sharing valuable information and putting your people in touch with the expert they need.

- Keep your nuggets of gold. Capture information surfaced in team conversations and add it to Knobot.
- Simply create knowledge and add it directly from Slack.
- Democratise valuable information. No specialist knowledge-base, wiki, or integration is required.
- Find the experts in your organisation. Mention their skills in Knobot, promote their contribution and give kudos.
- Bring Knobot to your customer channels to them directly to knowledge and expertise



#### Architecture behind Knobot

1. The serverless 1.0rc-1 framework is used to manage the dev/prod staging to AWS Lambda.
2. AWS Elastic Search powers the team wide knowledge storage and retrieval.
3. NLP Compromise is used for natural language parsing of requests.


#### How to build & run

1. Install [serverless 1.0rc1 framework](https://github.com/serverless/serverless)
2. Configure serverless with the appropriate AWS credentials [(more here)](https://github.com/serverless/serverless/blob/master/docs/02-providers/aws/01-setup.md)
3. Create an Elastic Search service in AWS.
3. Pull the 'knobot' source
4. Create a [Slack App](https://api.slack.com/slack-apps) (with a BOT, and the appropriate Event API permissions)
5. You'll need to update the 'config.js' file to include the Slack App client details.
6. Also update the Elastic Search endpoint in 'config.js'
7. Run 'npm install' and 'serverless deploy' from the knobot-lambda/ directory
8. You're now up and running. Take note of the 'auth' and 'eventendpoint' urls
9. Head back to Slack, and update/verify the 'auth' and 'eventendpoint' urls in your App
10. Now, create a 'Add To Slack' button.
11. Click on 'Add to Slack', and install knobot to your team.
