# Amazon Product Page Clone

## Overview
A React-based e-commerce product page clone styled after Amazon Spain. Features a single-product experience with a full checkout flow integrated with Portuguese payment methods (MB WAY and Multibanco).

## Tech Stack
- **Frontend**: React 19 + Vite 8
- **Styling**: Vanilla CSS (App.css, index.css)
- **Input Masking**: react-imask
- **Build Tool**: Vite
- **Package Manager**: npm

## Backend
- **PHP 8.2**: `api/process_payment.php` — acts as a proxy to the `waymb.com` payment gateway API

## Project Structure
```
├── api/
│   └── process_payment.php     # PHP payment gateway proxy
├── public/                     # Static assets (images, icons)
├── src/
│   ├── App.jsx                 # Main app (product page + checkout flow)
│   ├── App.css                 # App styles
│   ├── main.jsx                # React entry point
│   └── index.css               # Global styles
├── index.html
├── vite.config.js              # Vite config (port 5000, host 0.0.0.0)
└── package.json
```

## Development
- Run: `npm run dev` (starts Vite dev server on port 5000)
- Build: `npm run build`

## Key Features
- Product landing page with images, ratings, descriptions
- Checkout form with name, address, NIF fields
- Portuguese postal code auto-lookup via `json.geoapi.pt`
- MB WAY and Multibanco payment method support
