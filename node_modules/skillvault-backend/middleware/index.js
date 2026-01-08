const { auth, optionalAuth } = require('./auth');
const validate = require('./validate');
const { errorHandler, notFound } = require('./errorHandler');

module.exports = {
    auth,
    optionalAuth,
    validate,
    errorHandler,
    notFound
};
