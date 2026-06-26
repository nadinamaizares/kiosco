# LubriGestión 🛢

Sistema de gestión de stock para lubricentros.  
React + Vite + Supabase. Funciona en celular como PWA.

---

## Setup en 5 pasos

### 1. Instalar dependencias
```bash
npm install
```

### 2. Crear proyecto en Supabase
1. Entrá a [supabase.com](https://supabase.com) y creá una cuenta gratuita
2. Nuevo proyecto → nombre: `lubricentro`
3. Guardá la contraseña de la base de datos
4. Esperá que se cree (~2 minutos)

### 3. Configurar variables de entorno
```bash
cp .env.example .env.local
```
Luego editá `.env.local` con tus claves de Supabase  
(las encontrás en Settings → API de tu proyecto)

### 4. Ejecutar el SQL en Supabase
1. Abrí el SQL Editor en tu proyecto de Supabase
2. Copiá y pegá todo el contenido de `supabase_setup.sql`
3. Ejecutá

Esto crea las tablas, las políticas de seguridad, la función de stock  
y algunos productos de ejemplo para empezar.

### 5. Crear el primer usuario
En Supabase → Authentication → Users → Invite user  
Ingresá el email del empleado. Recibirá un email para setear su contraseña.

### 6. Correr el proyecto
```bash
npm run dev
```
Abrí [http://localhost:5173](http://localhost:5173)

---

## Estructura del proyecto

```
src/
├── modules/
│   ├── stock/          ← Módulo de inventario (activo)
│   │   ├── stock.service.js    ← Toda la lógica con Supabase
│   │   ├── HomePage.jsx        ← Dashboard con alertas
│   │   ├── InventarioPage.jsx  ← Listado de productos
│   │   ├── EntradaStockPage.jsx ← Entrada con escáner
│   │   ├── SalidaStockPage.jsx  ← Salida simple o kit
│   │   └── MovimientosPage.jsx  ← Historial
│   ├── auth/           ← Login y protección de rutas
│   └── clientes/       ← (próximo módulo)
└── shared/             ← Código compartido
    ├── supabase.js     ← Cliente de BD
    ├── Scanner.jsx     ← Componente de cámara
    ├── Layout.jsx      ← Navbar + contenedor
    └── useToast.js     ← Notificaciones
```

## Deploy en Vercel (gratis)

1. Subí el proyecto a GitHub
2. Entrá a [vercel.com](https://vercel.com) → New Project → importá tu repo
3. En Environment Variables agregá las mismas variables de `.env.local`
4. Deploy → listo, tenés una URL pública

Los empleados entran desde el celular con esa URL, sin instalar nada.

---

## Próximos módulos planeados
- **Clientes** — fichas, historial de servicios, KL del auto
- **Recordatorios** — alertas de próximo cambio por km o fecha
- **Reportes** — ventas, stock bajo, rotación de productos
