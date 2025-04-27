// Middleware para CSP con configuraciones seguras
app.use((req, res, next) => {
    // CSP con configuración segura
    const nonce = Buffer.from(crypto.randomBytes(16)).toString('base64');
    res.setHeader(
      'Content-Security-Policy',
      `default-src 'self'; ` +
      `script-src 'self' https://fonts.googleapis.com https://fonts.gstatic.com 'nonce-${nonce}'; ` +
      `connect-src 'self'; ` +
      `img-src 'self' https://fonts.gstatic.com data:; ` +
      `font-src 'self' https://fonts.gstatic.com; ` +
      `style-src 'self' https://fonts.googleapis.com; ` +
      `frame-src 'none'; ` +
      `object-src 'none'; ` +
      `base-uri 'self'; ` +
      `form-action 'self';`
    );
    
    // Añadir el nonce a res.locals para usarlo en las vistas
    res.locals.cspNonce = nonce;
    next();
  });