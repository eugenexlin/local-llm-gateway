const crypto = require('crypto');

function hashKey(key) {
    return crypto.createHash('sha256').update(key).digest('hex');
}

function generateApiKey() {
    return `lf_${crypto.randomBytes(32).toString('base64')}`;
}

function hashToken(token) {
    return crypto.createHash('sha256').update(token).digest('hex');
}

module.exports = {
    hashKey,
    generateApiKey,
    hashToken
};
