const jwt = require('jsonwebtoken');

// Revisa que la petición traiga un token válido y deja los datos del usuario en req.usuario
exports.requiere = (req, res, next) => {
  const token = (req.headers.authorization || '').replace('Bearer ', '');
  try {
    req.usuario = jwt.verify(token, process.env.JWT_SECRET);
    next();
  } catch {
    res.status(401).json({ error: 'Sesión inválida' });
  }
};

exports.soloAdmin = (req, res, next) => {
  if (req.usuario.rol === 'admin') return next();
  res.status(403).json({ error: 'Solo administrador' });
};
