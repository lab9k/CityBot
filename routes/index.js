const express = require('express');
const { map, sample } = require('lodash');

const router = express.Router();
const { WebhookClient, Card } = require('dialogflow-fulfillment');
const log = require('../util/log')(__filename.split('/').pop());
const getData = require('../services/index');

/**
 * Map that maps intent names to handlers
 * @type {Map<string, function>}
 */
const intentMap = new Map();
intentMap.set('ChooseTypeIntent', (agent) => {
  const { query: type } = agent;
  const convertToCards = d => new Card({
    title: d.name,
    text: d.description,
    imageUrl: sample(d.images),
    buttonText: 'Go to website',
    buttonUrl: d.pageUrl,
  });
  switch (type) {
    case 'Events':
      getData('events')((err, data) => {
        if (err) {
          agent.add('Er ging iets mis.');
          return;
        }
        agent.add(map(data, convertToCards));
      });
      break;
    case 'Attracties':
      getData('attractions')((err, data) => {
        if (err) {
          agent.add('Er ging iets mis.');
          return;
        }
        agent.add(map(data, convertToCards));
      });
      break;
    default:
      agent.add('Ik versta je niet.');
      break;
  }
});

/**
 * Routes HTTP POST requests to index. It catches all fulfillment's from Dialogflow.
 */
router.post('/', (req, res) => {
  if (!req.body || Object.keys(req.body).length === 0) {
    res.status(400).send('Empty body');
  }

  const agent = new WebhookClient({ request: req, response: res });
  agent.handleRequest(intentMap).catch(err => log.log('error', err));
});

module.exports = router;
