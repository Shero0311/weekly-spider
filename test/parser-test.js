const fs = require('fs');
const parsers = [
    {
        type: 'atom',
        testFile: 'atom.xml'
    },
    {
        type: 'rss',
        testFile: 'rss.xml'
    },
    {
        type: 'html',
        testFile: 'html.html',
        option: {
            article: '.article-list li',
            title: '.title a',
            link: '.title a@href',
            published: '.time@data-shared-at'
        }
    }
];

parsers.forEach(parser => {
    const parserName = parser.type;
    const parse = require(`../src/parser/${parserName}.js`);
    const xmlFile = `./${parser.testFile}`;
    fs.readFile(xmlFile, 'utf-8', (err, data) => {
        if (err) throw err;
        parse(data, parser.option).then(console.log).then(a => {
            console.log(`以上是 ${parserName} 的运行结果\n\n`);
        });
    });
});
