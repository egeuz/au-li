const fs = require('fs');
const input = require('../assets/data/test_data.json');
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
fs.writeFileSync('../assets/data/test_data_p.json', JSON.stringify(output));