"use strict";

var parseHTML = require('./html.js');

module.exports = function(html) {
    return parseHTML(html, {
        article: '.repository-content li',
        title: '.issue-title-link',
        link: '.issue-title-link@href',
        published: 'time@datetime'
    });
};

