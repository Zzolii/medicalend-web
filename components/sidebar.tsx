// Path: medicalend-web/components/sidebar.tsx
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Activity,
  Building2,
  CalendarDays,
  CreditCard,
  FileText,
  Home,
  Layers3,
  LogOut,
  Search,
  Shield,
  User,
  Users,
  BriefcaseMedical,
  ClipboardList,
  CheckCircle2,
} from "lucide-react";
import { clearSession, type SessionRole } from "@/lib/auth";

type SidebarProps = {
  role?: SessionRole | null;
  clinicRole?: string | null;
};

type NavItem = {
  href: string;
  label: string;
  icon: React.ComponentType<{ size?: number }>;
};

function joinClasses(...values: Array<string | false | null | undefined>) {
  return values.filter(Boolean).join(" ");
}

const patientItems: NavItem[] = [
  { href: "/dashboard", label: "Acasă", icon: Home },
  { href: "/search", label: "Căutare", icon: Search },
  { href: "/episodes", label: "Episoade", icon: Activity },
  { href: "/appointments", label: "Programări", icon: CalendarDays },
  { href: "/journey", label: "Journey", icon: Activity },
  { href: "/profile", label: "Profil", icon: User },
];

const providerDoctorItems: NavItem[] = [
  { href: "/dashboard", label: "Acasă", icon: Home },
  { href: "/appointments", label: "Programări", icon: CalendarDays },
  { href: "/episodes", label: "Episoade", icon: Activity },
  { href: "/referrals", label: "Trimiteri", icon: FileText },
  { href: "/patients", label: "Pacienți", icon: Users },
  { href: "/profile", label: "Profil", icon: User },
];

const clinicAdminItems: NavItem[] = [
  { href: "/dashboard", label: "Acasă", icon: Home },
  { href: "/appointments", label: "Programări", icon: CalendarDays },
  { href: "/episodes", label: "Episoade", icon: Activity },
  { href: "/referrals", label: "Trimiteri", icon: FileText },
  { href: "/patients", label: "Pacienți", icon: Users },
  { href: "/staff", label: "Personal", icon: ClipboardList },
  { href: "/clinics", label: "Clinica mea", icon: Building2 },
  { href: "/billing", label: "Billing", icon: CreditCard },
  { href: "/profile", label: "Profil", icon: User },
];

const receptionItems: NavItem[] = [
  { href: "/dashboard", label: "Acasă", icon: Home },
  { href: "/appointments", label: "Programări", icon: CalendarDays },
  { href: "/patients", label: "Pacienți", icon: Users },
  { href: "/referrals", label: "Trimiteri", icon: FileText },
  { href: "/profile", label: "Profil", icon: User },
];

const assistantItems: NavItem[] = [
  { href: "/dashboard", label: "Acasă", icon: Home },
  { href: "/appointments", label: "Programări", icon: CalendarDays },
  { href: "/episodes", label: "Episoade", icon: Activity },
  { href: "/patients", label: "Pacienți", icon: Users },
  { href: "/profile", label: "Profil", icon: User },
];

const adminItems: NavItem[] = [
  { href: "/admin", label: "Panou general", icon: Shield },
  {
    href: "/admin/providers",
    label: "Aprobări furnizori",
    icon: CheckCircle2,
  },
  { href: "/clinics", label: "Clinici & listings", icon: Building2 },
  { href: "/admin/subscription-plans", label: "Planuri", icon: Layers3 },
  {
    href: "/admin/clinic-subscriptions",
    label: "Abonamente",
    icon: CreditCard,
  },
  { href: "/patients", label: "Pacienți", icon: Users },
  { href: "/profile", label: "Profil", icon: User },
];

function itemsForRole(
  role?: SessionRole | null,
  clinicRole?: string | null,
): NavItem[] {
  if (role === "patient") return patientItems;
  if (role === "admin") return adminItems;

  if (clinicRole === "clinic_admin") return clinicAdminItems;
  if (clinicRole === "doctor") return providerDoctorItems;
  if (clinicRole === "assistant") return assistantItems;
  if (clinicRole === "reception") return receptionItems;

  return providerDoctorItems;
}

export function Sidebar({ role, clinicRole }: SidebarProps) {
  const pathname = usePathname();
  const items = itemsForRole(role, clinicRole);

  function handleLogout() {
    clearSession();
    window.location.href = "/login";
  }

  return (
    <aside className="mc-sidebar">
      <div className="mc-sidebar-brand">
        <div className="mc-sidebar-brand-icon">
          <BriefcaseMedical size={20} />
        </div>

        <div>
          <p className="mc-sidebar-brand-title">MediCalend</p>
          <p className="mc-sidebar-brand-subtitle">Portal web medical</p>
        </div>
      </div>

      <nav className="mc-sidebar-nav">
        {items.map((item) => {
          const Icon = item.icon;
          const active =
            pathname === item.href || pathname.startsWith(`${item.href}/`);

          return (
            <Link
              key={item.href}
              href={item.href}
              className={joinClasses(
                "mc-sidebar-link",
                active && "mc-sidebar-link-active",
              )}
            >
              <Icon size={18} />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>

      <button className="mc-sidebar-logout" onClick={handleLogout}>
        <LogOut size={18} />
        <span>Ieșire</span>
      </button>
    </aside>
  );
}
