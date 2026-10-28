import './globals.css';

export const metadata = {
  title: 'Turno — Gerenciador de tarefas',
  description: 'Um espaço de foco para organizar tarefas, acompanhar o progresso e fechar o dia com clareza.',
};

export default function RootLayout({ children }) {
  return (
    <html lang="pt-BR" className="dark">
      <body>{children}</body>
    </html>
  );
}
