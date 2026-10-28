import 'dotenv/config';
import app from './app.js';
import pool from './config/database.js';

const port = Number(process.env.PORT || 3333);

try {
  await pool.query('SELECT 1');
  const server = app.listen(port, () => {
    console.log(`Tarefas API rodando em http://localhost:${port}`);
  });

  const shutdown = async () => {
    server.close(async () => {
      await pool.end();
      process.exit(0);
    });
  };

  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
} catch (error) {
  console.error('Não foi possível conectar ao MySQL. Confira o serviço e o arquivo .env.');
  console.error(error.message);
  process.exit(1);
}
