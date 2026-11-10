import '../v2-public.css';

export default function V2AuthPublicLayout({ children }: { children: React.ReactNode }) {
  return <div className="auth-shell">{children}</div>;
}
