"use strict";

const request = require('request');
const fs = require('fs');
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
            timeout: 10000,
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
    let parser = require(`./parser/${context.site.type}.js`);
    return parser(context.body, context.site.option).then(articles => {
        context.articles = articles;
        context = fixLink(context);
        return context;
    });
}

function fixLink (context) {
    const url = require('url');
    if (context.site.type == 'html') {
        context.articles.forEach(article => {
            article.link = url.resolve(context.site.url, article.link);
        });
    }
    return context ;
}

//根据发布时间筛选出符合要求的内容
function filterArticles (context) {
    //context.site.lastTime = null;
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
    //console.log(context.articles);
    context.articles.forEach(article => {
        //调用标签获取函数
        var tags = getLabel(article);
        let postData = {
            title: article.title,
            url: article.link,
            description: article.description,
            provider: '梁幸芝Shero',
            tags: tags
        };
        if (process.env.DEBUG) {
            console.log(`发送数据到周刊接口：${JSON.stringify(postData, null, 4)}`);
            return;
        }
        console.log(`推送文章：${article.title}`);
        request({
            uri: weeklyApi,
            method: 'POST',
            body: postData,
            json: true
        }, (err, response, body) => {
            if (err) {
                console.log(err);
            }
        });
    });
}
