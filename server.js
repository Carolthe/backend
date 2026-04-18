const app = require("./app");
const PORT = process.env.PORT;

app.listen(PORT, "0.0.0.0", () => {
  console.log(`Servidor rodando na porta ${PORT}`);
});