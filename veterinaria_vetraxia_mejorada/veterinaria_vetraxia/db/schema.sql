CREATE TABLE IF NOT EXISTS usuarios (
  id SERIAL PRIMARY KEY,
  nombre VARCHAR(100) NOT NULL,
  email VARCHAR(120) UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  rol VARCHAR(10) NOT NULL DEFAULT 'cliente'
);
CREATE TABLE IF NOT EXISTS servicios (
  id SERIAL PRIMARY KEY,
  nombre VARCHAR(100) NOT NULL,
  duracion_min INT NOT NULL DEFAULT 60,
  precio NUMERIC(8,2) NOT NULL DEFAULT 0,
  activo BOOLEAN NOT NULL DEFAULT TRUE
);
CREATE TABLE IF NOT EXISTS citas (
  id SERIAL PRIMARY KEY,
  usuario_id INT NOT NULL REFERENCES usuarios(id),
  servicio_id INT NOT NULL REFERENCES servicios(id),
  fecha DATE NOT NULL,
  hora TIME NOT NULL,
  estado VARCHAR(12) NOT NULL DEFAULT 'reservada'
);
CREATE UNIQUE INDEX IF NOT EXISTS una_cita_por_hora
  ON citas(fecha, hora) WHERE estado = 'reservada';

CREATE TABLE IF NOT EXISTS mascotas (
  id SERIAL PRIMARY KEY,
  usuario_id INT NOT NULL REFERENCES usuarios(id),
  nombre VARCHAR(80) NOT NULL,
  especie VARCHAR(30) NOT NULL,
  raza VARCHAR(60),
  edad VARCHAR(30),
  activo BOOLEAN NOT NULL DEFAULT TRUE
);
ALTER TABLE citas ADD COLUMN IF NOT EXISTS mascota_id INT REFERENCES mascotas(id);
ALTER TABLE citas ADD COLUMN IF NOT EXISTS motivo VARCHAR(200);
DROP INDEX IF EXISTS una_cita_por_hora;
CREATE UNIQUE INDEX IF NOT EXISTS una_cita_activa ON citas(fecha, hora) WHERE estado <> 'cancelada';

CREATE TABLE IF NOT EXISTS horarios (
  dia SMALLINT PRIMARY KEY, abre TIME NOT NULL, cierra TIME NOT NULL, activo BOOLEAN NOT NULL DEFAULT TRUE
);
INSERT INTO horarios(dia,abre,cierra,activo) VALUES
 (0,'09:00','13:00',FALSE),(1,'08:00','17:00',TRUE),(2,'08:00','17:00',TRUE),(3,'08:00','17:00',TRUE),
 (4,'08:00','17:00',TRUE),(5,'08:00','17:00',TRUE),(6,'09:00','13:00',TRUE) ON CONFLICT (dia) DO NOTHING;
ALTER TABLE citas ADD COLUMN IF NOT EXISTS hora_fin TIME;
ALTER TABLE citas ADD COLUMN IF NOT EXISTS notas VARCHAR(500);

-- Ticket con código único por cita
ALTER TABLE citas ADD COLUMN IF NOT EXISTS codigo VARCHAR(20);
UPDATE citas SET codigo = 'VTX-' || to_char(fecha,'YYMMDD') || '-' || upper(substr(md5(random()::text || id::text),1,6)) WHERE codigo IS NULL;
CREATE UNIQUE INDEX IF NOT EXISTS citas_codigo_unico ON citas(codigo);

-- Códigos de recuperación de clave (válidos 15 minutos, 5 intentos)
CREATE TABLE IF NOT EXISTS recuperaciones (
  id SERIAL PRIMARY KEY,
  usuario_id INT NOT NULL REFERENCES usuarios(id),
  codigo_hash TEXT NOT NULL,
  expira TIMESTAMPTZ NOT NULL,
  intentos INT NOT NULL DEFAULT 0,
  usado BOOLEAN NOT NULL DEFAULT FALSE
);
