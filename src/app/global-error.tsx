"use client";

/** Kök yerleşim de çökerse gösterilen en son çare sayfası (stil dosyası yüklenemeyebilir, bu yüzden satır içi stil). */
export default function GlobalError({ reset }: { error: Error; reset: () => void }) {
  return (
    <html lang="tr">
      <body style={{ fontFamily: "system-ui, sans-serif", display: "grid", placeItems: "center", minHeight: "100vh", margin: 0, textAlign: "center", padding: 24 }}>
        <div>
          <h1 style={{ fontSize: 28, margin: 0 }}>Arena Dedektör</h1>
          <p style={{ color: "#555" }}>Şu an bir sorun yaşıyoruz. Lütfen biraz sonra tekrar dene.</p>
          <button onClick={reset} style={{ background: "#d42e1e", color: "#fff", border: 0, borderRadius: 8, padding: "12px 20px", fontWeight: 800, cursor: "pointer" }}>Tekrar dene</button>
        </div>
      </body>
    </html>
  );
}
