"use client";

import { useMemo, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Users, Search } from "lucide-react";

interface ClientSummary {
  client_id: string;
  full_name: string;
  email: string;
  appointment_count: number;
  completed_count: number;
  last_appointment: string | null;
  phone: string | null;
}

export default function ClientsList({
  clients,
}: {
  clients: ClientSummary[];
}) {
  const [search, setSearch] = useState("");

  const filtered = useMemo(() => {
    if (!search) return clients;
    const q = search.toLowerCase();
    return clients.filter(
      (c) =>
        c.full_name?.toLowerCase().includes(q) ||
        c.email?.toLowerCase().includes(q)
    );
  }, [clients, search]);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2 md:w-80">
        <Search className="h-4 w-4 text-muted-foreground" />
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar cliente..."
        />
      </div>

      {filtered.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Users className="mx-auto h-12 w-12 text-muted-foreground/50 mb-3" />
            <p className="text-muted-foreground">
              {clients.length === 0
                ? "Aún no tienes clientes. Cuando alguien reserve, aparecerá aquí."
                : "No hay clientes que coincidan con tu búsqueda."}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((client) => (
            <Card key={client.client_id}>
              <CardContent className="p-4">
                <div className="flex items-center gap-3 mb-3">
                  <Avatar>
                    <AvatarFallback className="bg-emerald-100 text-emerald-700">
                      {client.full_name?.charAt(0)?.toUpperCase() ?? "?"}
                    </AvatarFallback>
                  </Avatar>
                  <div className="min-w-0">
                    <p className="font-medium text-foreground truncate">
                      {client.full_name}
                    </p>
                    <p className="text-sm text-muted-foreground truncate">
                      {client.email}
                    </p>
                  </div>
                </div>
                {client.phone && (
                  <p className="text-sm text-muted-foreground mb-2">📞 {client.phone}</p>
                )}
                <div className="flex gap-2">
                  <Badge variant="secondary">
                    {client.appointment_count} citas
                  </Badge>
                  <Badge
                    variant="outline"
                    className="text-emerald-700 border-emerald-200"
                  >
                    {client.completed_count} completadas
                  </Badge>
                </div>
                {client.last_appointment && (
                  <p className="text-xs text-muted-foreground mt-3">
                    Última cita: {client.last_appointment}
                  </p>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
