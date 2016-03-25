module.exports = {
    getProperty (obj, name) {
        var value;
        if (Array.isArray(obj[name])) {
            value = obj[name] && obj[name][0];
        } else {
            value = obj[name];
        }
        if (typeof value === 'string') {
            return value;
        }
        if (typeof value === 'object' && value._) {
            return value._;
        }
        return value || '';
    },
    stripTags (str) {
        return str.replace(/<[^>]+>/g, '');
    }

};
