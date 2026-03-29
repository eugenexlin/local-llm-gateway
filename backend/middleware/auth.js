const database = require('../database');
const { hashKey } = require('../utils/hash');

function validateApiKey(req, res, next) {
   if (!database.isReady()) {
     return res.status(503).json({
       error: 'Service unavailable',
       message: 'Database not initialized'
     });
   }

   const apiKey = req.headers['x-api-key'];

   if (!apiKey) {
     return res.status(401).json({
       error: 'API key required',
       message: 'Please provide an API key in the x-api-key header'
     });
   }

   const keyHash = hashKey(apiKey);

   const keyData = database.validateApiKey(keyHash);

   if (!keyData) {
     return res.status(401).json({
       error: 'Invalid API key',
       message: 'The provided API key is not valid'
     });
   }

   req.apiKeyId = keyData.id;
   req.apiKeyHash = keyHash;

   next();
 }

module.exports = {
  validateApiKey
};
