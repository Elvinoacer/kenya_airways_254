"use client";
import React, { useCallback, useEffect, useState } from "react";
import { useToast } from "@/app/ClientProviders";
import VirtualizedList from "@/app/ui/VirtualizedList";

const PAGE_SIZE = 50;

function TicketRow({
  t,
  onAction,
}: {
  t: any;
  onAction: (id: string, status: string) => void;
}) {
  return (
    <div className="p-3 border rounded">
      <div className="flex justify-between">
        <div>
          <div className="font-semibold">{t.subject || "No subject"}</div>
          <div className="text-sm text-slate-500">
            {t.email} • {t.ticket_ref}
          </div>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => onAction(t.id, "CLOSED")}
            className="px-2 py-1 bg-rose-500 text-white rounded"
          >
            Close
          </button>
          <button
            onClick={() => onAction(t.id, "ESCALATED")}
            className="px-2 py-1 bg-yellow-500 text-black rounded"
          >
            Escalate
          </button>
        </div>
      </div>
      <p className="mt-2 text-sm">{t.message}</p>
    </div>
  );
}

const MemoTicketRow = React.memo(TicketRow);

export default function AdminSupportPage() {
  const [tickets, setTickets] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [noMore, setNoMore] = useState(false);
  const [cursor, setCursor] = useState<string | null>(null);
  const toast = useToast();

  const loadMore = useCallback(async () => {
    if (loading || noMore) return;
    setLoading(true);
    try {
      const cursorParam = cursor ? `&cursor=${encodeURIComponent(cursor)}` : "";
      const res = await fetch(
        `/api/support/tickets?limit=${PAGE_SIZE}${cursorParam}`,
      );
      const json = await res.json();
      const list = json.tickets || [];
      const nextCursor = json.nextCursor || null;
      setTickets((s) => s.concat(list));
      setCursor(nextCursor);
      if (!nextCursor || list.length < PAGE_SIZE) setNoMore(true);
    } catch (e) {
      console.error(e);
      toast.push({ message: "Failed to load tickets", tone: "error" });
    }
    setLoading(false);
  }, [tickets.length, loading, noMore, toast]);

  useEffect(() => {
    // initial load
    loadMore();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function setStatus(id: string, status: string) {
    await fetch(`/api/support/tickets/${id}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ status }),
    });
    toast.push({ message: "Updated", tone: "success" });
    // optimistic update
    setTickets((s) => s.map((t) => (t.id === id ? { ...t, status } : t)));
  }

  return (
    <main className="p-6">
      <h1 className="text-2xl font-semibold">Support Tickets</h1>
      <div className="mt-4">
        {loading && tickets.length === 0 && <div>Loading...</div>}
        <VirtualizedList
          items={tickets}
          rowHeight={140}
          height={600}
          renderItem={(item) => <MemoTicketRow t={item} onAction={setStatus} />}
          onEndReached={loadMore}
          endThresholdRows={2}
        />
        {loading && tickets.length > 0 && (
          <div className="mt-2">Loading more...</div>
        )}
        {noMore && (
          <div className="mt-2 text-sm text-slate-500">No more tickets</div>
        )}
      </div>
    </main>
  );
}
