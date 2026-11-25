# Quedamos

Sistema web de reserva de citas. Node.js + Express + PostgreSQL. Roles: administrador y cliente.

## Ejecutar en tu computadora
1. Instala Node.js 18+ y PostgreSQL. Crea una base de datos llamada `quedamos`.
2. Copia `.env.example` como `.env` y ajusta `DATABASE_URL`, `JWT_SECRET`, `ADMIN_EMAIL` y `ADMIN_PASSWORD`.
3. `npm install`
4. `npm start`
5. Abre http://localhost:3000 (las tablas y el administrador se crean solos).

## Subir a la nube (Render + base de datos gratuita en Neon o Supabase)
1. Sube el proyecto a GitHub (sin `.env`).
2. Crea la base PostgreSQL en la nube y copia su URL de conexión.
3. En Render crea un Web Service desde tu repositorio:
   - Build Command: `npm install`
   - Start Command: `npm start`
4. En Environment agrega: `DATABASE_URL`, `DB_SSL=true`, `JWT_SECRET`, `ADMIN_EMAIL`, `ADMIN_PASSWORD`.
5. Verifica `https://tu-app.onrender.com/salud`.
