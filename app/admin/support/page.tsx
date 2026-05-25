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
  const status = t.status || "OPEN";
  const isClosed = status === "CLOSED" || status === "RESOLVED";
  const isEscalated = status === "ESCALATED";

  return (
    <div className={`p-4 mx-4 mb-3 border rounded-2xl transition-all group ${
      isClosed ? "bg-slate-50 border-slate-200 opacity-60" :
      isEscalated ? "bg-amber-50 border-amber-200 shadow-sm" :
      "bg-white border-[#e5e2e1] hover:border-primary/50 shadow-[0_4px_12px_rgba(13,13,13,0.03)]"
    }`}>
      <div className="flex justify-between items-start mb-3">
        <div className="flex gap-3">
          <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${
            isClosed ? "bg-slate-200 text-slate-500" :
            isEscalated ? "bg-amber-200 text-amber-700" :
            "bg-primary/10 text-primary"
          }`}>
            <span className="material-symbols-outlined text-[18px]">
              {isClosed ? "check_circle" : isEscalated ? "warning" : "mail"}
            </span>
          </div>
          <div>
            <div className="font-bold text-[#1A1A1A] line-clamp-1">{t.subject || "No subject provided"}</div>
            <div className="text-xs text-[#5e3f3c] flex items-center gap-2 mt-0.5">
              <span className="font-mono text-primary bg-primary/5 px-1.5 py-0.5 rounded">{t.ticket_ref}</span>
              <span>•</span>
              <span>{t.email}</span>
              {t.created_at && (
                <>
                  <span>•</span>
                  <span>{new Date(t.created_at).toLocaleString()}</span>
                </>
              )}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {!isClosed && (
            <>
              {!isEscalated && (
                <button
                  onClick={() => onAction(t.id, "ESCALATED")}
                  className="px-3 py-1.5 bg-amber-100 hover:bg-amber-200 text-amber-800 text-xs font-bold rounded-lg transition-colors flex items-center gap-1 cursor-pointer"
                >
                  <span className="material-symbols-outlined text-[14px]">priority_high</span>
                  Escalate
                </button>
              )}
              <button
                onClick={() => onAction(t.id, "CLOSED")}
                className="px-3 py-1.5 bg-white border border-[#e5e2e1] hover:bg-green-50 hover:text-green-700 hover:border-green-200 text-[#1A1A1A] text-xs font-bold rounded-lg transition-colors flex items-center gap-1 cursor-pointer"
              >
                <span className="material-symbols-outlined text-[14px]">check</span>
                Close
              </button>
            </>
          )}
          {isClosed && (
            <span className="text-[10px] font-bold uppercase tracking-widest text-slate-500 bg-slate-100 px-2.5 py-1 rounded-md border border-slate-200">
              Resolved
            </span>
          )}
        </div>
      </div>
      <div className="pl-[52px]">
        <p className="text-sm text-[#5e3f3c] bg-[#fcf9f8] p-3 rounded-xl border border-[#e5e2e1] line-clamp-2">
          {t.message || "No message content."}
        </p>
      </div>
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
  }, [cursor, loading, noMore, toast]);

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
    toast.push({ message: `Ticket marked as ${status.toLowerCase()}`, tone: "success" });
    // optimistic update
    setTickets((s) => s.map((t) => (t.id === id ? { ...t, status } : t)));
  }

  // Summary counts
  const openCount = tickets.filter(t => !t.status || t.status === "OPEN" || t.status === "NEW").length;
  const escalatedCount = tickets.filter(t => t.status === "ESCALATED").length;

  return (
    <div className="text-[#1A1A1A] h-screen flex flex-col">
      <header className="bg-white border-b border-[#e5e2e1] shrink-0 z-10">
        <div className="flex items-center justify-between px-6 py-6 lg:px-8">
          <div>
            <div className="text-xs font-bold uppercase tracking-widest text-primary mb-1">
              Customer Experience
            </div>
            <h1 className="text-3xl font-black text-[#1A1A1A]">
              Support Desk
            </h1>
            <p className="text-sm text-[#5e3f3c] mt-2 max-w-2xl">
              Manage passenger inquiries, resolve issues, and escalate priority tickets.
            </p>
          </div>
          
          <div className="flex gap-4">
            <div className="bg-[#fcf9f8] border border-[#e5e2e1] rounded-2xl px-5 py-3 flex items-center gap-4">
              <div className="text-center">
                <div className="text-2xl font-black text-[#1A1A1A]">{openCount}</div>
                <div className="text-[10px] font-bold uppercase tracking-widest text-[#5e3f3c]">Open</div>
              </div>
              <div className="w-px h-8 bg-[#e5e2e1]"></div>
              <div className="text-center">
                <div className="text-2xl font-black text-amber-600">{escalatedCount}</div>
                <div className="text-[10px] font-bold uppercase tracking-widest text-amber-700">Escalated</div>
              </div>
            </div>
          </div>
        </div>
      </header>

      <main className="flex-1 overflow-hidden p-6 lg:p-8 flex justify-center bg-slate-50">
        <div className="w-full max-w-[1000px] bg-white rounded-3xl border border-[#e5e2e1] shadow-[0_8px_32px_rgba(13,13,13,0.06)] flex flex-col h-full overflow-hidden">
          <div className="p-4 border-b border-[#e5e2e1] bg-[#fcf9f8] flex items-center justify-between shrink-0">
            <h2 className="text-sm font-bold text-[#1A1A1A] flex items-center gap-2">
              <span className="material-symbols-outlined text-[#5e3f3c] text-[18px]">forum</span>
              Ticket Queue
            </h2>
            <div className="flex items-center gap-2">
              {loading && tickets.length === 0 && (
                 <span className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
              )}
              <span className="text-xs font-bold text-[#5e3f3c]">
                {tickets.length} Loaded
              </span>
            </div>
          </div>
          
          <div className="flex-1 relative">
            {tickets.length > 0 ? (
              <VirtualizedList
                items={tickets}
                rowHeight={160} // Adjusted for new padding/layout
                height={typeof window !== 'undefined' ? window.innerHeight - 300 : 600}
                renderItem={(item) => <MemoTicketRow t={item} onAction={setStatus} />}
                onEndReached={loadMore}
                endThresholdRows={2}
              />
            ) : !loading && (
              <div className="absolute inset-0 flex flex-col items-center justify-center text-[#5e3f3c]">
                <span className="material-symbols-outlined text-5xl mb-4 opacity-30">inbox</span>
                <div className="text-lg font-bold text-[#1A1A1A]">Inbox Zero</div>
                <p className="text-sm">There are no support tickets in the queue.</p>
              </div>
            )}
            
            {/* Loading / End Indicators inside the scrollable area */}
            <div className="absolute bottom-0 left-0 right-0 p-4 flex justify-center pointer-events-none bg-gradient-to-t from-white to-transparent">
              {loading && tickets.length > 0 && (
                <div className="bg-white border border-[#e5e2e1] shadow-md rounded-full px-4 py-2 text-xs font-bold text-[#5e3f3c] flex items-center gap-2">
                  <span className="w-3 h-3 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                  Loading more...
                </div>
              )}
              {noMore && tickets.length > 0 && (
                <div className="bg-[#fcf9f8] border border-[#e5e2e1] rounded-full px-4 py-2 text-[10px] font-bold uppercase tracking-widest text-[#5e3f3c]">
                  End of Queue
                </div>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
