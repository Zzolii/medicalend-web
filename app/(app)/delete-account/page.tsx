// Path: medicalend-web/app/delete-account/page.tsx

import Link from "next/link";

export default function DeleteAccountPage() {
  return (
    <main
      style={{
        minHeight: "100vh",
        background: "#F7F9FC",
        padding: "40px 16px",
        fontFamily: "Arial, sans-serif",
      }}
    >
      <section
        style={{
          maxWidth: 760,
          margin: "0 auto",
          background: "#FFFFFF",
          border: "1px solid #E6EAF2",
          borderRadius: 18,
          padding: 28,
          color: "#0F172A",
          lineHeight: 1.7,
        }}
      >
        <h1 style={{ marginTop: 0 }}>Ștergere cont MediCalend</h1>

        <p>
          Utilizatorii MediCalend își pot șterge sau solicita ștergerea contului
          direct din aplicație.
        </p>

        <h2>Cum îți poți șterge contul</h2>

        <ol>
          <li>Autentifică-te în aplicația MediCalend.</li>
          <li>
            Mergi la secțiunea <strong>Profil</strong>.
          </li>
          <li>
            Apasă pe <strong>Șterge contul</strong>.
          </li>
          <li>Confirmă acțiunea.</li>
        </ol>

        <h2>Ce se întâmplă după ștergere</h2>

        <p>
          Contul tău va fi dezactivat, iar profilul pacientului va fi separat de
          contul de utilizator. Unele date asociate programărilor, episoadelor
          medicale sau documentelor pot fi păstrate atunci când este necesar
          pentru trasabilitate, securitate, obligații legale sau conformitate.
        </p>

        <h2>Solicitare prin e-mail</h2>

        <p>
          Dacă nu poți accesa aplicația, poți solicita ștergerea contului prin
          e-mail:
        </p>

        <p>
          <strong>Email:</strong>{" "}
          <a href="mailto:zv220675@gmail.com">zv220675@gmail.com</a>
        </p>

        <p>
          În mesaj, include adresa de e-mail folosită la înregistrarea în
          MediCalend.
        </p>

        <div style={{ marginTop: 28 }}>
          <Link href="/login" style={{ color: "#2F6BFF", fontWeight: 700 }}>
            Înapoi la autentificare
          </Link>
        </div>
      </section>
    </main>
  );
}
