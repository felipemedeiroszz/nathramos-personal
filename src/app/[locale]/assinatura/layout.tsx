import "../(student)/student.css";
export default function BillingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="student-shell min-h-dvh bg-background text-text">
      {children}
    </div>
  );
}
