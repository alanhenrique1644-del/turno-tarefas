export function notFoundHandler(req, res) {
  return res.status(404).json({ error: 'Rota não encontrada.', path: req.originalUrl });
}
