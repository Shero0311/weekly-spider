"use strict";

const request = require('request');
const fs = require('fs');
const configFile = __dirname + '/../config/sites.json';
const timeFile = __dirname + '/../runtime/lastTime.json';
const sites = require(configFile);
const getLabel = require('./getLabel.js');
const debug = require('debug')('index');

let lastTimes = {};
const threadNum = 5;
const weeklyApi = 'http://old.75team.com/weekly/admin/article.php?action=add';

run();

/**
 * 入口
 */
function run() {

    //获取上次抓取时间
    try {
        lastTimes = require(timeFile);
    } catch(ex) {
        console.log(ex);
        console.warn('警告：没有发现抓取记录。');
    }

    //启动多个线程抓取
    const length = Math.ceil(sites.length / threadNum);
    const chunks = new Array(threadNum).fill(1).map((_, i) => {
        return sites.slice(i * length, (i + 1) * length);
    });
    Promise.all(chunks.map(sites => worker(sites)))
        .then(saveCrawlTime) //完成后记录抓取时间
        .then(() => console.log('done'));
}

/**
 * run worker
 */
function worker(sites) {
    return sites.reduce(
        (p, site) => p.then(() => crawlSite(site)),
        Promise.resolve()
    );
}

/**
 * 处理指定网站
 */
function crawlSite(site) {
    console.log(`开始抓取网站 ${site.url}`);
    return init(site)
        .then(getRSS)
        .then(parseXml)
        .then(filterArticles)
        .then(setLastTime)
        .then(postArticles)
        .catch(ex => {
            console.log(ex);
        });
}

/**
 * 初始化context
 **/
function init(site) {
    return Promise.resolve({site: site});
}

/*
 * 用request获取rss数据
 * */
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
/*
 *获取到的rss数据是xml或者其他格式，转换格式成json格式
 * */
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
/*
 * 根据发布时间筛选出符合要求的内容
 * */

function filterArticles (context) {
    //lastTimes[context.site.url] = null;
    var times = lastTimes[context.site.url] || 0;
    var beforeSeven = +new Date() - 3600 * 24 * 7 * 1000;
    var lastTime = Math.max(times, beforeSeven);
    context.articles = context.articles.filter(article => +new Date (article.published) > lastTime);
    return context;
}

/*
 * 标记网站访问时间
 * */
function setLastTime(context) {
    var url = context.site.url;
    lastTimes[url] = +new Date();
    return Promise.resolve(context);
}

/*
 * 将符合要求的内容发送到文章推荐的接口
 * */
function postArticles (context) {
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

/**
 * 保存每个网站抓取时间的记录
 */
function saveCrawlTime() {
    let content = JSON.stringify(lastTimes, null, 4);
    fs.writeFile(timeFile, content, err => err && console.log(err));
}

