export default function Home() {
  return (
    <main style={{ fontFamily: "system-ui", padding: "2rem", maxWidth: 640 }}>
      <h1>Usage Metering &amp; Billing Engine</h1>
      <p>Backend capstone. See the API:</p>
      <ul>
        <li><code>GET /api/health</code></li>
        <li><code>POST /api/generate</code></li>
        <li><code>GET /api/usage</code></li>
        <li><code>POST /api/checkout</code></li>
        <li><code>POST /api/webhooks/stripe</code></li>
      </ul>
    </main>
  );
}