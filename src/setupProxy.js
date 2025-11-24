const { createProxyMiddleware } = require('http-proxy-middleware');

module.exports = function(app) {
  app.use(
    ['/api', '/_next', '/logo', '/console', '/favicon.ico', '/chat', '/cdn-cgi'],
    createProxyMiddleware({
      target: 'https://udify.app',
      changeOrigin: true,
      secure: true,
      pathRewrite: (path, req) => {
        // Fix Next.js static paths if they are requested as /static/css instead of /_next/static/css
        if (path.startsWith('/static/css')) {
            return path.replace('/static/css', '/_next/static/css');
        }
        if (path.startsWith('/static/chunks')) {
            return path.replace('/static/chunks', '/_next/static/chunks');
        }
        return path;
      },
      onProxyReq: (proxyReq, req, res) => {
        // Remove accept-encoding to prevent compression issues
        proxyReq.removeHeader('accept-encoding');
      },
      onProxyRes: (proxyRes, req, res) => {
        // Remove CSP to avoid console errors and allow style injection
        delete proxyRes.headers['content-security-policy'];
        delete proxyRes.headers['content-security-policy-report-only'];

        // Add aggressive caching for static assets
        const path = req.url;

        if (path.includes('/_next/static/') ||
            path.includes('.js') ||
            path.includes('.css') ||
            path.includes('.woff') ||
            path.includes('.woff2')) {
          // Cache static assets for 1 hour
          proxyRes.headers['cache-control'] = 'public, max-age=3600, immutable';
          console.log(`[Cache] Setting aggressive cache for: ${path}`);
        } else if (path.includes('/chat/')) {
          // Cache chat HTML for 5 minutes
          proxyRes.headers['cache-control'] = 'public, max-age=300';
          console.log(`[Cache] Setting moderate cache for: ${path}`);
        }
      },
      logLevel: 'silent' // Reduce console noise
    })
  );
};

