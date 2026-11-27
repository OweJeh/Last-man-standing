"use client";

import React, { useState } from "react";
import { Search } from "lucide-react";
import { formatDateTime } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";

export interface AdminEntryRow {
  id: string;
  round_id: string;
  display_name: string;
  assigned_number: number;
  status: string;
  created_at: string;
  profiles?: { full_name: string; email: string; phone: string | null } | null;
  raffle_rounds?: { round_code: string; name: string } | null;
  payment_submissions?: { status: string; transaction_reference: string } | null;
}

export interface AdminProfileRow {
  id: string;
  full_name: string;
  email: string;
  phone: string | null;
  role: string;
  created_at: string;
}

export function AdminParticipantsClient({
  entries,
  profiles,
}: {
  entries: AdminEntryRow[];
  profiles: AdminProfileRow[];
}) {
  const [tab, setTab] = useState<"entries" | "accounts">("entries");
  const [search, setSearch] = useState("");
  const [roundFilter, setRoundFilter] = useState<string>("all");

  const roundCodes = Array.from(
    new Set(entries.map((e) => e.raffle_rounds?.round_code).filter(Boolean) as string[])
  );

  const q = search.trim().toLowerCase();

  const filteredEntries = entries.filter((r) => {
    if (roundFilter !== "all" && r.raffle_rounds?.round_code !== roundFilter) {
      return false;
    }
    if (!q) return true;
    return (
      r.display_name.toLowerCase().includes(q) ||
      String(r.assigned_number) === q ||
      (r.profiles?.email ?? "").toLowerCase().includes(q) ||
      (r.profiles?.full_name ?? "").toLowerCase().includes(q) ||
      (r.payment_submissions?.transaction_reference ?? "").toLowerCase().includes(q) ||
      (r.raffle_rounds?.round_code ?? "").toLowerCase().includes(q)
    );
  });

  const filteredProfiles = profiles.filter((p) => {
    if (!q) return true;
    return (
      p.full_name.toLowerCase().includes(q) ||
      p.email.toLowerCase().includes(q) ||
      (p.phone ?? "").toLowerCase().includes(q)
    );
  });

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex flex-wrap gap-2">
          <Button
            variant={tab === "entries" ? "primary" : "secondary"}
            size="sm"
            onClick={() => setTab("entries")}
          >
            CONFIRMED ENTRIES ({entries.length})
          </Button>
          <Button
            variant={tab === "accounts" ? "primary" : "secondary"}
            size="sm"
            onClick={() => setTab("accounts")}
          >
            REGISTERED ACCOUNTS ({profiles.length})
          </Button>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {tab === "entries" && roundCodes.length > 0 && (
            <select
              value={roundFilter}
              onChange={(e) => setRoundFilter(e.target.value)}
              className="h-10 rounded-md border border-white/15 bg-[#111111] px-3 text-xs text-white focus:border-[#EF3038] focus:outline-none"
            >
              <option value="all">All Rounds</option>
              {roundCodes.map((code) => (
                <option key={code} value={code}>
                  {code}
                </option>
              ))}
            </select>
          )}
          <div className="relative w-full sm:w-64">
            <Search className="h-4 w-4 text-[#666666] absolute left-3 top-3" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search name, #, email, ref..."
              className="pl-9 h-10"
            />
          </div>
        </div>
      </div>

      {tab === "entries" ? (
        <Card className="bg-[#141414] border-white/10 overflow-x-auto">
          {filteredEntries.length === 0 ? (
            <div className="p-8 text-center text-sm text-[#999999]">
              No confirmed raffle entries found.
            </div>
          ) : (
            <table className="w-full text-left text-sm">
              <thead className="border-b border-white/10 text-xs uppercase text-[#999999]">
                <tr>
                  <th className="p-4">Number</th>
                  <th className="p-4">Display Name</th>
                  <th className="p-4">Account</th>
                  <th className="p-4">Round</th>
                  <th className="p-4">Entry Status</th>
                  <th className="p-4">Payment</th>
                  <th className="p-4">Entered</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/10">
                {filteredEntries.map((r) => (
                  <tr key={r.id}>
                    <td className="p-4 font-display font-bold tabular-nums">
                      #{r.assigned_number}
                    </td>
                    <td className="p-4 font-semibold">{r.display_name}</td>
                    <td className="p-4 text-xs text-[#999999]">
                      <div>{r.profiles?.full_name || "—"}</div>
                      <div className="text-[11px] text-[#666666]">
                        {r.profiles?.email}
                      </div>
                    </td>
                    <td className="p-4 text-xs text-[#999999]">
                      {r.raffle_rounds?.round_code}
                    </td>
                    <td className="p-4">
                      <Badge
                        variant={
                          r.status === "winner"
                            ? "gold"
                            : r.status === "alive"
                            ? "success"
                            : "muted"
                        }
                      >
                        {r.status.toUpperCase()}
                      </Badge>
                    </td>
                    <td className="p-4 font-mono text-xs text-[#999999]">
                      <div>{r.payment_submissions?.status?.toUpperCase()}</div>
                      <div className="text-[11px] text-[#666666]">
                        {r.payment_submissions?.transaction_reference}
                      </div>
                    </td>
                    <td className="p-4 text-xs text-[#999999]">
                      {formatDateTime(r.created_at)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </Card>
      ) : (
        <Card className="bg-[#141414] border-white/10 overflow-x-auto">
          {filteredProfiles.length === 0 ? (
            <div className="p-8 text-center text-sm text-[#999999]">
              No registered accounts found.
            </div>
          ) : (
            <table className="w-full text-left text-sm">
              <thead className="border-b border-white/10 text-xs uppercase text-[#999999]">
                <tr>
                  <th className="p-4">Full Name</th>
                  <th className="p-4">Email</th>
                  <th className="p-4">Phone</th>
                  <th className="p-4">Role</th>
                  <th className="p-4">Joined</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/10">
                {filteredProfiles.map((p) => (
                  <tr key={p.id}>
                    <td className="p-4 font-semibold">{p.full_name}</td>
                    <td className="p-4 text-xs text-[#999999]">{p.email}</td>
                    <td className="p-4 text-xs text-[#999999]">{p.phone || "—"}</td>
                    <td className="p-4">
                      <Badge variant={p.role === "admin" ? "gold" : "default"}>
                        {p.role.toUpperCase()}
                      </Badge>
                    </td>
                    <td className="p-4 text-xs text-[#999999]">
                      {formatDateTime(p.created_at)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </Card>
      )}
    </div>
  );
}

