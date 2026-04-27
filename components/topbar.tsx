// Path: medicalend-web/components/topbar.tsx
"use client";

import { useMemo } from "react";
import { usePathname } from "next/navigation";
import { useAppUser } from "@/components/user-context";

function getRoleLabel(globalRole?: string | null, clinicRole?: string | null) {
  if (clinicRole === "clinic_admin") return "Administrator clinică";
  if (clinicRole === "doctor") return "Medic";
  if (clinicRole === "assistant") return "Asistent";
  if (clinicRole === "reception") return "Recepție";

  if (globalRole === "admin") return "Administrator platformă";
  if (globalRole === "provider") return "Furnizor medical";
  if (globalRole === "patient") return "Pacient";

  return "Cont";
}

function getPageMeta(pathname: string) {
  // 🔥 admin
  if (pathname.startsWith("/admin/providers")) {
    return {
      title: "Furnizori",
      subtitle: "Gestionează furnizorii înregistrați pe platformă.",
    };
  }

  if (pathname.startsWith("/admin/clinic-subscriptions")) {
    return {
      title: "Abonamente",
      subtitle: "Administrează abonamentele clinicilor.",
    };
  }

  if (pathname.startsWith("/admin")) {
    return {
      title: "Administrare",
      subtitle: "Vizualizează statistici și activitatea platformei.",
    };
  }

  // 🔥 provider / clinic
  if (pathname.startsWith("/patients")) {
    return {
      title: "Pacienți",
      subtitle: "Vizualizează și gestionează pacienții.",
    };
  }

  if (pathname.startsWith("/appointments")) {
    return {
      title: "Programări",
      subtitle: "Gestionează programările și vizitele.",
    };
  }

  if (pathname.startsWith("/episodes")) {
    return {
      title: "Episoade",
      subtitle: "Monitorizează episoadele de îngrijire.",
    };
  }

  if (pathname.startsWith("/referrals")) {
    return {
      title: "Trimiteri",
      subtitle: "Gestionează cererile și colaborările medicale.",
    };
  }

  if (pathname.startsWith("/staff")) {
    return {
      title: "Personal",
      subtitle: "Administrează echipa clinicii.",
    };
  }

  if (pathname.startsWith("/clinics")) {
    return {
      title: "Clinica mea",
      subtitle: "Detalii despre clinică și configurări.",
    };
  }

  // 🔥 fallback dashboard
  if (pathname.startsWith("/dashboard")) {
    return {
      title: "Panou",
      subtitle: "Vizualizează rapid activitatea și datele esențiale.",
    };
  }

  return {
    title: "MediCalend",
    subtitle: "Platformă de management medical.",
  };
}

export function Topbar() {
  const pathname = usePathname();
  const { role, clinicRole, displayName } = useAppUser();

  const name = useMemo(() => {
    if (typeof displayName === "string" && displayName.trim()) {
      return displayName.trim();
    }
    return "Utilizator";
  }, [displayName]);

  const roleLabel = useMemo(
    () => getRoleLabel(role, clinicRole),
    [role, clinicRole],
  );

  const avatarLetter = useMemo(() => {
    const first = name.charAt(0);
    return first ? first.toUpperCase() : "U";
  }, [name]);

  const { title, subtitle } = useMemo(() => getPageMeta(pathname), [pathname]);

  return (
    <header className="mc-topbar">
      <div>
        <h1 className="mc-topbar-title">{title}</h1>
        <p className="mc-topbar-subtitle">{subtitle}</p>
      </div>

      <div className="mc-topbar-user">
        <div className="mc-avatar">{avatarLetter}</div>

        <div>
          <p className="mc-topbar-user-name">{name}</p>
          <p className="mc-topbar-user-role">{roleLabel}</p>
        </div>
      </div>
    </header>
  );
}
