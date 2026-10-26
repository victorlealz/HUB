# HubWinZip144

Hub minimalista em HTML, CSS e JavaScript puro, preparado para Cloudflare Workers + Static Assets.

## Deploy corrigido para Cloudflare

Este projeto foi ajustado para o mesmo fluxo exibido no log da Cloudflare:

```bash
npx wrangler deploy
```

O `wrangler.toml` agora define:

- `main = "./src/index.js"` para o Worker;
- `public/` como diretório de assets estáticos;
- `ASSETS` como binding dos arquivos estáticos;
- execução do Worker primeiro apenas em `/api/*`;
- `AUTH_ENABLED` e `BILLING_ENABLED` desativados por padrão.

Assim, o deploy não depende de `wrangler pages deploy` e não apresenta o erro de `Missing entry-point`.

### Configuração recomendada no build da Cloudflare

- Build command: deixe vazio, ou use `bun run check` se desejar validar a sintaxe antes do deploy.
- Deploy command: `npx wrangler deploy`.
- Root directory: raiz do repositório.

## Estrutura

```text
HubWinZip144/
├── public/
│   ├── index.html
│   ├── css/styles.css
│   ├── js/app.js
│   ├── data/apps.json
│   ├── config/site.json
│   ├── assets/
│   ├── _headers
│   └── manifest.webmanifest
├── src/
│   └── index.js               <- Worker e rotas /api/*
├── database/schema.sql        <- base futura para Cloudflare D1
├── wrangler.toml
└── package.json
```

## Atualizar o catalogo

O arquivo normalmente editado e:

`public/data/apps.json`

Exemplo minimo:

```json
{
  "url": "https://minha-plataforma.pages.dev",
  "icon": "https://cdn-icons-png.flaticon.com/caminho/icone.png"
}
```

Campos opcionais:

```json
{
  "url": "https://minha-plataforma.pages.dev",
  "icon": "https://cdn-icons-png.flaticon.com/caminho/icone.png",
  "name": "Minha Plataforma",
  "description": "Descricao curta",
  "category": "Produtividade",
  "keywords": ["xml", "relatorio", "consulta"],
  "featured": true,
  "badge": "novo"
}
```

## Desenvolvimento local

Instale as dependencias:

```bash
bun install
```

Depois:

```bash
bun run dev
```

## Validacao antes do deploy

```bash
bun run check
bun run deploy:dry
```

O segundo comando compila e valida a configuracao do Worker sem publicar.

## Rotas de API

- `GET /api/health` - status do hub e das flags de backend.
- `GET /api/session` - ponto de entrada futuro para sessao/login.
- `POST /api/billing/checkout` - ponto de entrada futuro para cobranca/QR Code.

Enquanto `AUTH_ENABLED` e `BILLING_ENABLED` estiverem como `false`, o hub opera em modo gratuito.

## Preparacao para D1, login e cobranca

O arquivo `database/schema.sql` ja contem a base futura. Para ativar D1, configure o binding `DB` no `wrangler.toml`. Segredos, tokens e chaves de API devem ficar no ambiente do Worker e nunca no JavaScript de `public/`.
