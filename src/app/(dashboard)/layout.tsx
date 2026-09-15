"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { useEffect, useState } from "react";
import { User } from "@supabase/supabase-js";
import {
  LayoutDashboard,
  Briefcase,
  Users,
  CalendarDays,
  Contact,
  CalendarRange,
  Wallet,
  CreditCard,
  Settings,
  LogOut,
  ExternalLink,
} from "lucide-react";

const navSections = [
  {
    label: "General",
    items: [
      { href: "/overview", label: "Inicio", icon: LayoutDashboard },
      { href: "/calendar", label: "Calendario", icon: CalendarRange },
      { href: "/appointments", label: "Citas", icon: CalendarDays },
    ],
  },
  {
    label: "Negocio",
    items: [
      { href: "/services", label: "Servicios", icon: Briefcase },
      { href: "/employees", label: "Empleados", icon: Users },
      { href: "/clients", label: "Clientes", icon: Contact },
    ],
  },
  {
    label: "Cuenta",
    items: [
      { href: "/payments", label: "Pagos", icon: Wallet },
      { href: "/billing", label: "Facturación", icon: CreditCard },
      { href: "/settings", label: "Configuración", icon: Settings },
    ],
  },
];

interface Business {
  id: string;
  name: string;
  slug: string;
}

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [business, setBusiness] = useState<Business | null>(null);
  const supabase = createClient();

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser();
      setUser(user);
      if (user) {
        const { data } = await supabase
          .from("businesses")
          .select("id, name, slug")
          .eq("owner_id", user.id)
          .maybeSingle();
        setBusiness(data);
      }
    }
    load();
  }, [supabase]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  };

  return (
    <div className="flex min-h-screen bg-background">
      <aside className="w-64 shrink-0 bg-sidebar border-r border-sidebar-border flex flex-col">
        <div className="h-16 flex items-center px-5 border-b border-sidebar-border">
          <Link href="/overview" className="flex items-center gap-2">
            <span className="flex h-7 w-7 items-center justify-center rounded-md bg-primary text-primary-foreground text-sm font-bold">
              A
            </span>
            <span className="text-lg font-semibold tracking-tight text-sidebar-foreground">
              Agendalo
            </span>
          </Link>
        </div>

        <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-5">
          {navSections.map((section) => (
            <div key={section.label}>
              <p className="px-3 mb-1.5 text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                {section.label}
              </p>
              <div className="space-y-0.5">
                {section.items.map((item) => {
                  const Icon = item.icon;
                  const active = pathname === item.href;
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      className={`flex items-center gap-2.5 px-3 py-2 rounded-md text-sm transition-colors ${
                        active
                          ? "bg-sidebar-accent text-sidebar-accent-foreground font-medium"
                          : "text-sidebar-foreground/70 hover:bg-sidebar-accent/60 hover:text-sidebar-foreground"
                      }`}
                    >
                      <Icon className="h-4 w-4 shrink-0" strokeWidth={active ? 2.25 : 2} />
                      {item.label}
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>

        <div className="p-3 border-t border-sidebar-border space-y-3">
          {business ? (
            <Link
              href={`/${business.slug}`}
              target="_blank"
              className="flex items-center justify-between gap-2 px-3 py-2.5 bg-muted rounded-md text-xs text-muted-foreground hover:text-foreground transition-colors group"
            >
              <span className="truncate">agendalo.com/{business.slug}</span>
              <ExternalLink className="h-3.5 w-3.5 shrink-0 opacity-60 group-hover:opacity-100" />
            </Link>
          ) : (
            <div className="p-3 bg-accent rounded-md">
              <p className="text-xs text-accent-foreground mb-2">
                Aún no has configurado tu negocio
              </p>
              <Link href="/onboarding">
                <Button size="sm" className="w-full">
                  Configurar negocio
                </Button>
              </Link>
            </div>
          )}
          {user && (
            <div className="flex items-center justify-between gap-2 px-1">
              <div className="flex items-center gap-2 min-w-0">
                <div className="w-8 h-8 shrink-0 rounded-full bg-primary flex items-center justify-center text-primary-foreground text-sm font-semibold">
                  {user.email?.charAt(0).toUpperCase()}
                </div>
                <span className="text-sm text-muted-foreground truncate">
                  {user.email}
                </span>
              </div>
              <Button
                variant="ghost"
                size="icon-sm"
                title="Cerrar sesión"
                onClick={handleLogout}
              >
                <LogOut className="h-4 w-4" />
              </Button>
            </div>
          )}
        </div>
      </aside>
      <main className="flex-1 min-w-0 p-6 md:p-8">
        {children}
      </main>
    </div>
  );
}
