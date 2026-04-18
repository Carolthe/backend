const jwt = require("jsonwebtoken");

module.exports = function (req, res, next) {
  const token = req.cookies.token;

  if (!token) {
    return res.status(401).json({ error: "Não autorizado" });
  }

  try {
    const decoded = jwt.verify(
      token,
      process.env.JWT_SECRET
    );

    req.usuario = decoded; // 🔥 salva o usuário na requisição
    next();

  } catch (err) {
    return res.status(401).json({ error: "Token inválido" });
  }
};