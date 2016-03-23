"use strict";

const request = require('request');
const fs = require('fs');
const parseString = require('xml2js').parseString;
const configFile = __dirname + '/../config/sites.json';
const sites = require(configFile);
const getLabel = require('./getLabel.js');
const debug = require('debug')('index');

const weeklyApi = 'http://old.75team.com/weekly/admin/article.php?action=add';

sites.forEach(site => {
    init(site)
        .then(getRSS)
        .then(parseXml)
        .then(filterArticles)
        .then(setLastTime)
        .then(postArticles)
        .catch(ex => {
            console.log(ex);
        });
});

/**
 * 初始化context
 **/
function init(site) {
    return Promise.resolve({site: site});
}

//用request获取rss
function getRSS(context) {
    return new Promise((resolve, reject) => {
        request(context.site.url, {
            timeout: 100000,
            //有的rss格式是压缩过的文件
            gzip: true,
            //rss文件不能直接访问，设置以浏览器身份访问
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 6.1; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/48.0.2564.116 Safari/537.36'
            }
        }, (error, response, body) => {
            if (error) {
                reject(error);
                console.log(`获取内容出错：${context.site.url}`);
                return;
            }
            context.body = body;
            resolve(context);
            debug(`Response content: ${body}`);
        });
    });
}

//获取到的rss数据是xml格式，转换格式成json对象
function parseXml (context) {
    return new Promise((resolve, reject) => {
        parseString(context.body, (err, result) => {
            if (err) {
                reject(err);
                console.log(`解析内容出错：${context.site.url}`);
                console.log(context.body);
                return;
            }
            if(context.site.type == 'atom') {
                context = parseAtom(context, result);
            } else {
                context = parseRss(context, result);
            }
            context.articles.forEach(article => {
            });

            resolve(context);
        });
    });
}

function parseAtom (context, result) {
    context.articles = result.feed.entry;
    context.articles.forEach(article => {
        article.published = article.published ? article.published[0] : article.updated[0];
        article.title = article.title[0]._ ? article.title[0]._ : article.title[0];
        let content = (article.content && article.content[0]) || '';
                if(typeof content != 'string') {
                    content = content._;
                }
                let description = content || (article.summary && article.summary[0]);
                if (typeof description != 'string') {
                    description = description._;
                }

                description = description.replace(/<[^>]+>/g, '');
                article.description = description.substr(0, 400);
                content = content.replace(/<[^>]+>/g, '');
                article.content = content;
                article.link = article.link[0].$.href;// ? article.link[0].$.href : article.link[0];
    });

    return context;
}

function parseRss (context, result) {
    context.articles = result.rss.channel[0].item;
    context.articles.forEach(article => {
        article.published = article.pubDate;
        article.title = article.title[0];
        let content = (article.description && article.description[0]) || '';
                if(typeof content != 'string') {
                    content = content._;
                }

                content = content.replace(/<[^>]+>/g, '');
                article.description = content.substr(0, 400);
                article.content = content;
                article.link = article.link[0];
    });
    return context;
}

//根据发布时间筛选出符合要求的内容
function filterArticles (context) {
    context.site.lastTime = null;
    var lastTime = context.site.lastTime || (+new Date() - 3600 * 24 * 7 * 1000);
    context.articles = context.articles.filter(article => +new Date (article.published) > lastTime);
    return context;
}

//标记网站访问时间
function setLastTime(context) {
    context.site.lastTime = +new Date();
    return new Promise((resolve, reject) => {
        fs.writeFile(configFile, JSON.stringify(sites, null, 4), err => {
            if (err) {
                return reject(err);
            }
            resolve(context);
        });
    });
}

//将符合要求的内容发送到文章推荐的接口
function postArticles (context) {
    context.articles.forEach(article => {
        //调用标签获取函数
        var tags = getLabel(article);
        let postData = {
            uri: weeklyApi,
            method: 'POST',
            body: {
                title: article.title,
                url: article.link,
                description: article.description,
                provider: '梁幸芝Shero',
                tags: tags
            },
            json: true
        };
        if (process.env.DEBUG) {
            //console.log(`发送数据到周刊接口：${JSON.stringify(postData, null, 4)}`);
            return;
        }
        request(postData, (err, response, body) => {
            if (err) {
                console.log(err);
            }
        });
    });
}
