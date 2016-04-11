"use strict";

module.exports = require('./html.js').bind(null, {
    article: '.repository-content li',
    title: '.issue-title-link',
    link: '.issue-title-link@href',
    published: 'time@datetime'
});

