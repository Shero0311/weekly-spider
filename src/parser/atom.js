"use strict";

const parseString = require('xml2js').parseString;
const getProperty = require('./xml-util').getProperty;
const stripTags = require('./xml-util').stripTags;

function parseAtom (xml) {

    return new Promise((resolve, reject) => {
        parseString(xml, (err, result) => {
            if (err) {
                reject(err);
                console.log(`解析内容出错：`);
                console.log(xml);
                return;
            }
            var articles = result.feed.entry.map(entry => {
                let title = getProperty(entry, 'title');
                let published = getProperty(entry,'published') || getProperty(entry, 'updated');
                let content = stripTags(getProperty(entry, 'content'));
                let description = (content || stripTags(getProperty(entry, 'summary'))).substr(0, 400);
                let link = entry.link[0].$.href;
                return {title, published, content, description, link};
            });
            resolve(articles);
        });
    });
}

module.exports = parseAtom;
