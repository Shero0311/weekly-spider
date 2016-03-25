const parseRss = require('../src/parser/rss.js');
const xmlFile = './atom.xml';
const fs = require('fs');
fs.readFile(xmlFile, 'utf-8', (err, data) => {
    if (err) throw err;
    parseAtom(data).then(console.log);
});
