// Copyright (c) 2021 Andrei O.
//
// This software is released under the MIT License.
// https://opensource.org/licenses/MIT

// Imports
import EosApi from 'eosjs-api';
import fs from 'fs';

// Config to control the script
const scriptOptions = {
  loggerVerbose: false,
};

// Main
const rcpOptions = {
  httpEndpoint: 'https://eos.greymass.com:443', // default, null for cold-storage
  verbose: false, // API logging
  logger: {
    // Default logging functions
    log: scriptOptions.loggerVerbose ? console.log : null,
    error: scriptOptions.loggerVerbose ? console.error : null,
  },
  fetchConfiguration: {},
};

const eosApi = EosApi(rcpOptions);

// Big array all the links
const links = [];
const doubledLinks = [];
let transactionsScanned = 0;

// Write stream, we let autoclose on to be fault tolerant in case graymass will restrict access
const file = fs.createWriteStream('doubleLinks.txt', {
  flags: 'w',
});

const yupCreatorAccount = 'yupcreators1';
let last_action = (await eosApi.getActions(yupCreatorAccount, -1, -1)).actions[0].account_action_seq;
// scan 16000 transactions ( 80 x 2000 )
for (let index = 0; index < 2000; index++) {
  const actions = (await eosApi.getActions(yupCreatorAccount, last_action - 80, 80)).actions;

  for (const transaction of actions) {
    if (transaction.action_trace.act.name === 'postvotev2') {
      const data = transaction.action_trace.act.data;
      // Check only popularity category
      if (data.category === 'popularity') {
        transactionsScanned++;
        if (links.includes(data.caption)) {
          doubledLinks.push(data.caption);
        } else {
          links.push(data.caption);
        }
      }
    }
  }
  // Drill down transactions 80 at a time
  last_action -= 80;
  // See live on running
  console.log(transactionsScanned);
  console.log(doubledLinks);
  // Rewrite the file after every 80 transactions in case graymass node restricts the requests
  file.write(`Transaction Scanned: ${transactionsScanned}\n`);
  file.write(`Number of duplicate posts: ${doubledLinks.length}\n\n`);
  file.write(`List of duplicate posts:`);
  for (const doubleLink of doubledLinks) {
    file.write(` ${doubleLink}\n`);
  }
}

console.log('DONE !');
