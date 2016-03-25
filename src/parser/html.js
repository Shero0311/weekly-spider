"use strict";

const cheerio = require('cheerio');

function parseHTML (html, option) {

    const $ = cheerio.load(html);
    const articles = $(option.article).map((i, node) => {
        const articleNode = $(node);
        return {
            title: getValue(articleNode, option.title),
            published: getValue(articleNode, option.published),
            content: getValue(articleNode, option.content),
            link: getValue(articleNode, option.link)
        };
    }).toArray();
    return Promise.resolve(articles);
}

function getValue(node, selector) {
    if (!selector) {
        return '';
    }
    const attr = selector.split('@')[1];
    selector = selector.split('@')[0];
    node = node.find(selector);
    return attr ? node.attr(attr) : node.text();
}

module.exports = parseHTML;
