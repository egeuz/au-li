const fs = require('fs');
const input = require('../data/chatbot.json');
const output = input.map(i => ({
  ...i,
  keywords: i
    .keywords
    .split(', ')
    .map(kw =>
      kw.toLowerCase()
    )
}
))
fs.writeFileSync('../data/chatbot.json', JSON.stringify(output));