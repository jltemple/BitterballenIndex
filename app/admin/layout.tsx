export default function AdminRootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-gray-50 text-gray-900 max-w-5xl mx-auto px-4 py-8">
        {children}
      </body>
    </html>
  );
}
