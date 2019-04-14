/**
 * Copyright 2017 IBM Corp. All Rights Reserved.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *      http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

const express = require('express');

const app = express();
require('./config/express')(app);
const AssistantV2 = require('watson-developer-cloud/assistant/v2');
const bank = require('./lib/bankFunctions');

// declare Watson Assistant service
const assistant = new AssistantV2({
  url: 'https://gateway.watsonplatform.net/assistant/api/',
  version: '2019-02-28',
  iam_apikey: 'NgmaEVLsmkXFRW2v92mPqLdADh45w3DW0OgztqMhCFqY'
});

const date = new Date();
date.setMonth(date.getMonth() + 1);
const newContext = {
  global: {
    system: {
      turn_count: 1
    }
  },
  skills: {
    'main skill': {
      user_defined: {
        acc_minamt: 50,
        acc_currbal: 430,
        acc_paydue: `${date.getFullYear()}-${date.getMonth() + 1}-26 12:00:00`,
        accnames: [5624, 5893, 9225]
      }
    }
  }
};

app.get('/', (req, res) => {
  res.render('./dist/index.html');
});

app.post('/api/message', (req, res) => {
  // check for workspace id and handle null workspace env variable
  const assistantId =
    process.env.ASSISTANT_ID || 'd9ace4b6-ebbf-496b-adab-ee59378a01ba';
  if (!assistantId) {
    return res.json({
      output: {
        text:
          'The app has not been configured with a ASSISTANT_ID environment variable.'
      }
    });
  }

  const contextWithAcc = req.body.context ? req.body.context : newContext;

  if (req.body.context) {
    contextWithAcc.global.system.turn_count += 1;
  }

  let textIn = '';

  if (req.body.input) {
    textIn = req.body.input.text;
  }

  // assemble assistant payload
  const payload = {
    assistant_id: assistantId,
    session_id: req.body.session_id,
    context: contextWithAcc,
    input: {
      message_type: 'text',
      text: textIn,
      options: {
        return_context: true
      }
    }
  };

  // send payload to Conversation and return result
  assistant.message(payload, (err, data) => {
    if (err) {
      // TODO: return error from service, currently service returns non-legal
      // status code
      return res.status(500).jsonp(err);
    }

    return res.json(data);
  });
});

app.get('/bank/validate', (req, res) => {
  const value = req.query.value;
  const isAccValid = bank.validateAcc(Number(value));
  // if accountNum is in list of valid accounts
  if (isAccValid === true) {
    res.send({ result: 'acc123valid' });
  } else {
    // return invalid by default
    res.send({ result: 'acc123invalid' });
  }
});

app.get('/bank/locate', (req, res) => {
  res.send({ result: 'zip123retrieved' });
});

app.get('/bank/statement', (req, res) => {
  const startingDate = new Date(req.query.value);
  const endingDate = new Date(
    startingDate.getFullYear(),
    startingDate.getMonth() + 1
  );
  const startingDateString = startingDate.toLocaleDateString();
  const endingDateString = endingDate.toLocaleDateString();

  res.send({
    result: 'statement',
    dates: { startingDate: startingDateString, endingDate: endingDateString }
  });
});

app.get('/api/session', (req, res) => {
  assistant.createSession(
    {
      assistant_id:
        process.env.ASSISTANT_ID || 'd9ace4b6-ebbf-496b-adab-ee59378a01ba'
    },
    (error, response) => {
      if (error) {
        console.log('error with the session', error);
        return res.send(error);
      }
      return res.send(response);
    }
  );
});

module.exports = app;
