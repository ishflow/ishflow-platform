export function BrandProvider({
  brandColor,
  children,
}: {
  brandColor: string | null;
  children: React.ReactNode;
}) {
  return (
    <>
      {brandColor ? <style>{`:root { --primary: ${brandColor}; }`}</style> : null}
      {children}
    </>
  );
}
