"use strict";

const parseString = require('xml2js').parseString;
const getProperty = require('./xml-util').getProperty;
const stripTags = require('./xml-util').stripTags;

function parseRss (xml) {


    return new Promise((resolve, reject) => {
        parseString(xml, (err, result) => {
            if (err) {
                reject(err);
                console.log(`解析内容出错：`);
                console.log(xml);
                return;
            }
            var articles = result.rss.channel[0].item.map(item => {
                let published = getProperty(item, 'pubDate');
                let title = getProperty(item, 'title');
                let content = stripTags(getProperty(item, 'description'));
                let description = content.substr(0, 400);
                let link = getProperty(item, 'link');
                return {title, published, content, description, link};
            });
            resolve(articles);
        });
    });
}

module.exports = parseRss;
