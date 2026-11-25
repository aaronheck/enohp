// Dev server only: forwards /mock-api to scripts/mock-api.js.
const { createProxyMiddleware } = require('http-proxy-middleware');

module.exports = function (app) {
  app.use(
    '/mock-api',
    createProxyMiddleware({ target: `http://127.0.0.1:${process.env.MOCK_API_PORT || 8098}`, changeOrigin: true })
  );
};
