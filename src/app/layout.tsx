export const metadata = {
  title: "Metering & Billing Engine",
  description: "Usage metering, quota enforcement, and Stripe billing.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}