const jwt = require('jsonwebtoken');
const JWT_SECRET = process.env.JWT_SECRET || 'rahasia_anda';

function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Authorization header tidak ditemukan atau format salah' });
  }
  const token = authHeader.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'Token tidak ditemukan' });

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) return res.status(403).json({ error: 'Akses ditolak' });
    req.user = user;
    next();
  });
}

module.exports = { authenticateToken };