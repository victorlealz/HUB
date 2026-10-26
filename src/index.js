const json = (body, status = 200, extraHeaders = {}) =>
  new Response(JSON.stringify(body), {
    status,
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'cache-control': 'no-store',
      ...extraHeaders
    }
  });

function methodNotAllowed(allowed) {
  return json(
    {
      ok: false,
      code: 'METHOD_NOT_ALLOWED',
      message: 'Metodo nao permitido para esta rota.'
    },
    405,
    { allow: allowed }
  );
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const { pathname } = url;

    if (pathname === '/api/health') {
      if (request.method !== 'GET') return methodNotAllowed('GET');

      return json({
        ok: true,
        service: 'HubWinZip144',
        mode: env.DB ? 'd1-ready' : 'static-free',
        auth: env.AUTH_ENABLED === 'true',
        billing: env.BILLING_ENABLED === 'true',
        timestamp: new Date().toISOString()
      });
    }

    if (pathname === '/api/session') {
      if (request.method !== 'GET') return methodNotAllowed('GET');

      if (env.AUTH_ENABLED !== 'true') {
        return json({
          authenticated: false,
          mode: 'free',
          authEnabled: false
        });
      }

      return json(
        {
          authenticated: false,
          mode: 'configured-not-implemented',
          authEnabled: true
        },
        501
      );
    }

    if (pathname === '/api/billing/checkout') {
      if (request.method !== 'POST') return methodNotAllowed('POST');

      if (env.BILLING_ENABLED !== 'true') {
        return json(
          {
            ok: false,
            code: 'BILLING_DISABLED',
            message: 'O HubWinZip144 esta em modo gratuito.'
          },
          409
        );
      }

      return json(
        {
          ok: false,
          code: 'BILLING_NOT_IMPLEMENTED',
          message: 'Conecte um provedor de pagamento antes de ativar BILLING_ENABLED.'
        },
        501
      );
    }

    if (pathname.startsWith('/api/')) {
      return json(
        {
          ok: false,
          code: 'NOT_FOUND',
          message: 'Rota de API nao encontrada.'
        },
        404
      );
    }

    return env.ASSETS.fetch(request);
  }
};
