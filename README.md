# SmartCredit Scraper - Backend

Backend API para el scraper de SmartCredit.com.

## Instalación

```bash
npm install
```

## Configuración

Copia `.env.example` a `.env` y configura las variables:

```bash
cp .env.example .env
```

Variables requeridas:
- `SMARTCREDIT_EMAIL` - Email de SmartCredit
- `SMARTCREDIT_PASSWORD` - Contraseña de SmartCredit
- `PORT` - Puerto del servidor API (default: 3001)

## Uso

### Servidor API
```bash
npm start
```

El servidor estará disponible en `http://localhost:3001`

Endpoints:
- `GET /health` - Health check
- `POST /api/sync` - Ejecutar scraping

### Scraper Standalone
```bash
npm run scrape
```

## Estructura

```
backend/
├── config/          # Configuración de selectores CSS
├── utils/           # Utilidades de parsing
├── server.js        # Servidor Express API
├── scraper.js       # Scraper standalone
└── package.json     # Dependencias
```

## Documentación Completa

Ver archivos en `../.claude/` para documentación detallada del proyecto.
