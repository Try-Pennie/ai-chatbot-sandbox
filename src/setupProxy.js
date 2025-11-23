const { createProxyMiddleware } = require('http-proxy-middleware');

module.exports = function(app) {
  app.use(
    ['/api', '/_next', '/logo', '/console', '/favicon.ico', '/chat'],
    createProxyMiddleware({
      target: 'https://udify.app',
      changeOrigin: true,
      secure: true,
      pathRewrite: (path, req) => {
        // Fix Next.js static paths if they are requested as /static/css instead of /_next/static/css
        // This happens if the upstream html refers to them relatively or if we need to map them.
        // The example code had this, so I will include it to be safe.
        if (path.startsWith('/static/css')) {
            return path.replace('/static/css', '/_next/static/css');
        }
        if (path.startsWith('/static/chunks')) {
            return path.replace('/static/chunks', '/_next/static/chunks');
        }
        return path;
      },
      onProxyReq: (proxyReq, req, res) => {
        // Remove accept-encoding to prevent compression, in case we need to debug or if it causes issues with the proxy
        // proxyReq.removeHeader('accept-encoding'); 
        // logic from example, but usually not strictly needed unless modifying response. 
        // I'll leave it out for simplicity unless issues arise.
      },
      logLevel: 'debug'
    })
  );
};

