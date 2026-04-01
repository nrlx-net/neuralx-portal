# NeuralX Portal

Portal de socios — NeuralX Global, Inc.

## Stack
- **Frontend**: Next.js 14 + React 18 + Tailwind CSS
- **Auth**: Microsoft Entra ID via NextAuth.js
- **Backend**: FastAPI en Azure Functions (panel.neuralxglobal.net)
- **Database**: Azure SQL (neuralxnet.database.windows.net/neuralxbank)
- **Deploy**: Vercel (portal.neuralxglobal.net)

## Setup local

```bash
# 1. Instalar dependencias
npm install

# 2. Crear archivo de entorno
cp .env.example .env.local

# 3. Editar .env.local con tus valores reales:
#    - AZURE_AD_CLIENT_ID
#    - AZURE_AD_TENANT_ID
#    - AZURE_AD_CLIENT_SECRET
#    - NEXTAUTH_SECRET (genera con: openssl rand -base64 32)

# 4. Correr en desarrollo
npm run dev

# 5. Abrir http://localhost:3000
```

## Estructura

```
src/
├── app/
│   ├── api/auth/[...nextauth]/route.ts  ← Config de Entra ID
│   ├── components/
│   │   ├── SessionProvider.tsx           ← Wrapper de NextAuth
│   │   └── Sidebar.tsx                  ← Navegación lateral
│   ├── dashboard/
│   │   ├── layout.tsx                   ← Layout con sidebar
│   │   └── page.tsx                     ← Dashboard principal
│   ├── cuentas/page.tsx                 ← Detalle de cuentas
│   ├── movimientos/page.tsx             ← Historial de transacciones
│   ├── solicitudes/page.tsx             ← Solicitudes de retiro
│   ├── login/page.tsx                   ← Página de login
│   ├── layout.tsx                       ← Root layout
│   ├── page.tsx                         ← Redirect a /dashboard
│   └── globals.css                      ← Estilos globales
├── lib/
│   └── api.ts                           ← Cliente API + tipos
├── middleware.ts                         ← Protección de rutas
└── types/
    └── next-auth.d.ts                   ← Extensiones de tipo
```

## Dominios

| Dominio | Uso |
|---------|-----|
| neuralxglobal.com | Landing page (Framer) |
| portal.neuralxglobal.net | Portal de socios (Next.js/Vercel) |
| panel.neuralxglobal.net | API backend (FastAPI/Azure Functions) |
| neuralxnet.database.windows.net | Azure SQL Server |

## Deploy a Vercel

1. Push a GitHub
2. Conectar repo en vercel.com
3. Configurar dominio: portal.neuralxglobal.net
4. Variables de entorno en Vercel dashboard
5. Deploy automático
