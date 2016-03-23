const labels = require('../config/labels.json');
const debug = require('debug')('label');

function getLabel(article) {
    return Object.keys(labels)
        .map(label => stat(label, article))
        .sort((a, b) => (b.count - a.count))
        .filter(label => label.count > 4)
        .slice(0, 5)
        .map(label => label.label)
        .join(',');
}
function stat(label, article) {
    //相关性计算 title出现的次数*5 + content出现的次数*1
    var relativity = labels[label]
        .map(label => {
            var titleMatchCount = getLabelCount(label, article.title);
            var contMatchCount = getLabelCount(label, article.content);
            return titleMatchCount * 5 + contMatchCount;
        })
        .reduce((a, b) => (a + b));

    relativity && debug(label + ', ' + relativity);

    return {
        label: label,
        count: relativity
    };
}

function getLabelCount(label, content) {
    if(!content) return 0;
    var pattern = new RegExp(label, 'gi');
    var ret = content.match(pattern);
    return ret ? ret.length : 0;
}

module.exports = getLabel;
