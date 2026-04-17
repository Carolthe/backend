const express = require("express");
const router = express.Router();
const db = require("../models/db");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const nodemailer = require("nodemailer");

// Registro de usuário
router.post("/registro", async (req, res) => {
  const { nome, email, telefone, pix_receber, senha } = req.body;
  try {
    const hash = await bcrypt.hash(senha, 10);
    const [result] = await db.query(
      `INSERT INTO usuarios (nome, email, telefone, pix_receber, senha) VALUES (?, ?, ?, ?, ?)`,
      [nome, email, telefone, pix_receber, hash]
    );
    res.json({ message: "Conta criada com sucesso!", id: result.insertId });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Erro ao criar conta" });
  }
});

// Login de usuário com JWT e cookie HttpOnly
router.post("/login", async (req, res) => {
  const { nome, senha } = req.body;
  try {
    const [rows] = await db.query(`SELECT * FROM usuarios WHERE nome = ?`, [nome]);
    if (rows.length === 0) return res.status(401).json({ error: "Usuário não encontrado" });

    const usuario = rows[0];
    const valid = await bcrypt.compare(senha, usuario.senha);
    if (!valid) return res.status(401).json({ error: "Senha incorreta" });

    const token = jwt.sign(
      { id_usuario: usuario.id_usuario, nome: usuario.nome },
      process.env.JWT_SECRET || "SEGREDO_SUPER_SEGURO",
      { expiresIn: "1h" }
    );

    res.cookie("token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV,
      sameSite: "lax",
      maxAge: 60 * 60 * 1000 // 1 hora
    });

    res.json({
      message: "Login realizado!",
      usuario: { id: usuario.id_usuario, nome: usuario.nome }
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Erro no servidor" });
  }
});

// =========================
// 🔓 LOGOUT (NOVO)
// =========================
router.post("/logout", (req, res) => {
  res.clearCookie("token", {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
  });

  return res.json({ message: "Logout realizado" });
});

// Endpoint para verificar autenticação
router.get("/verificar-auth", (req, res) => {
  const token = req.cookies.token;
  if (!token) return res.status(401).json({ logado: false });

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    res.json({ logado: true, usuario: decoded });
  } catch (err) {
    res.status(401).json({ logado: false });
  }
});

// 🔥 TEMP: salvar códigos (em produção use Redis ou DB)
const codigos = {};

// 🔥 CONFIG EMAIL (Gmail)
const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: "SEU_EMAIL@gmail.com",
    pass: "SENHA_DE_APP", // ⚠️ não é sua senha normal
  },
});

// =========================
// 📧 ENVIAR CÓDIGO
// =========================
router.post("/recuperar-senha/email", async (req, res) => {
  const { email } = req.body;

  try {
    const [rows] = await db.query(
      "SELECT * FROM usuarios WHERE email = ?",
      [email]
    );

    // 🔥 sempre retorna sucesso (segurança)
    if (rows.length > 0) {
      const codigo = Math.floor(100000 + Math.random() * 900000).toString();

      codigos[email] = {
        codigo,
        expira: Date.now() + 10 * 60 * 1000, // 10 min
      };

      await transporter.sendMail({
        from: "Seu App",
        to: email,
        subject: "Recuperação de senha",
        text: `Seu código é: ${codigo}`,
      });

    }

    res.json({ message: "Se o email existir, um código foi enviado" });

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Erro ao enviar email" });
  }
});

// =========================
// 🔐 REDEFINIR SENHA
// =========================
router.post("/redefinir-senha", async (req, res) => {
  const { email, codigo, novaSenha } = req.body;

  try {
    const registro = codigos[email];

    if (!registro) {
      return res.status(400).json({ error: "Código inválido" });
    }

    if (registro.codigo !== codigo) {
      return res.status(400).json({ error: "Código incorreto" });
    }

    if (Date.now() > registro.expira) {
      return res.status(400).json({ error: "Código expirado" });
    }

    const hash = await bcrypt.hash(novaSenha, 10);

    await db.query(
      "UPDATE usuarios SET senha = ? WHERE email = ?",
      [hash, email]
    );

    delete codigos[email];

    res.json({ message: "Senha redefinida com sucesso!" });

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Erro ao redefinir senha" });
  }
});

module.exports = router;