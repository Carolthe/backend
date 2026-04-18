const express = require("express");
const router = express.Router();
const db = require("../models/db");
const auth = require("../middleware/auth");

// ================================
// 🔥 CALCULAR PRÊMIO (POR PLACAR)
// ================================
router.post("/calcular", async (req, res) => {
  try {
    let { valor, id_jogo, placar1, placar2 } = req.body;


    if (!valor || valor <= 0 || !id_jogo || placar1 == null || placar2 == null) {
      return res.status(400).json({ error: "Dados inválidos" });
    }

    // 🔥 normalizar tipos (IMPORTANTE)
    placar1 = String(placar1);
    placar2 = String(placar2);

    const [[oddData]] = await db.query(
      `
      SELECT odd 
      FROM odds_placar 
      WHERE id_jogo = ? 
      AND CAST(placar1 AS CHAR) = ?
      AND CAST(placar2 AS CHAR) = ?
      LIMIT 1
      `,
      [id_jogo, placar1, placar2]
    );


    if (!oddData) {
      return res.status(404).json({
        error: "Odd não encontrada para esse placar"
      });
    }

    const premio = Number(valor) * Number(oddData.odd);

    return res.json({
      odd: Number(oddData.odd),
      premio: premio.toFixed(2),
    });

  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: "Erro ao calcular prêmio" });
  }
});


// ================================
// 🔥 CRIAR APOSTA
// ================================
router.post("/criar", auth, async (req, res) => {
  try {
    let { placar1, placar2, valor, id_jogo } = req.body;

    if (!placar1 || !placar2 || !valor || !id_jogo) {
      return res.status(400).json({ error: "Dados incompletos" });
    }

    const id_usuario = req.usuario.id_usuario;

    placar1 = String(placar1);
    placar2 = String(placar2);

    const [[oddData]] = await db.query(
      `
      SELECT odd 
      FROM odds_placar 
      WHERE id_jogo = ? 
      AND CAST(placar1 AS CHAR) = ?
      AND CAST(placar2 AS CHAR) = ?
      LIMIT 1
      `,
      [id_jogo, placar1, placar2]
    );


    if (!oddData) {
      return res.status(404).json({
        error: "Odd não encontrada para esse placar"
      });
    }

    const premio = Number(valor) * Number(oddData.odd);

    const [result] = await db.query(
      `
      INSERT INTO apostas 
      (id_usuario, id_jogo, placar1, placar2, valor, premio)
      VALUES (?, ?, ?, ?, ?, ?)
      `,
      [id_usuario, id_jogo, placar1, placar2, valor, premio]
    );

    return res.json({
      message: "Aposta registrada com sucesso",
      id_aposta: result.insertId,
      premio: premio.toFixed(2),
      odd: Number(oddData.odd)
    });

  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Erro ao registrar aposta" });
  }
});




// ================================
// 💳 PAGAMENTO PIX
// ================================
router.post("/pagar", auth, async (req, res) => {
  try {
    const { id_aposta, pix_pagamento, titular_banco } = req.body;

    if (!id_aposta || !pix_pagamento || !titular_banco) {
      return res.status(400).json({ error: "Dados incompletos" });
    }

    await db.execute(
      `INSERT INTO pagamentos_pix 
       (id_aposta, pix_pagamento, titular_banco, status, data_criacao)
       VALUES (?, ?, ?, ?, NOW())`,
      [
        id_aposta,
        pix_pagamento,
        titular_banco,
        "pendente"
      ]
    );

    return res.json({
      message: "Pagamento criado com sucesso"
    });

  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: "Erro ao criar pagamento" });
  }
});


// ================================
// 🔳 BUSCAR QR CODE PIX
// ================================
router.get("/qrcode-pix", async (req, res) => {
  try {
    const [rows] = await db.query(
      `SELECT pix_pagamento, imagem 
       FROM qrcodes_pix 
       ORDER BY id_qrcode DESC 
       LIMIT 1`
    );

    if (!rows || rows.length === 0) {
      return res.status(404).json({ error: "QR Code não encontrado" });
    }

    const qrcode = rows[0];

    return res.json({
      pix_pagamento: qrcode.pix_pagamento,
      imagem: qrcode.imagem,
    });

  } catch (error) {
    console.error("Erro ao buscar QR Code PIX:", error);
    return res.status(500).json({ error: "Erro ao buscar QR Code PIX" });
  }
});


// ================================
// 🔥 LISTAR JOGOS
// ================================
router.get("/jogos", async (req, res) => {
  try {
    const [jogos] = await db.query(
      "SELECT * FROM jogos ORDER BY data_jogo ASC"
    );

    res.json(jogos);

  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Erro ao buscar jogos" });
  }
});

module.exports = router;