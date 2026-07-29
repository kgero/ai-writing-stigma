export default function StudyShell({ children }: { children: React.ReactNode }) {
  return (
    <main>
      <div className="card">{children}</div>
    </main>
  );
}
