import React from "react";
import { router, Link } from "@inertiajs/react";
import { Bell, Check, Trash2, Clock, Info } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator
} from "@/components/ui/dropdown-menu";

type Notification = {
  id: number;
  ticket_id?: number | null;
  weekly_budget_id?: number | null;
  type?: string | null;
  title: string;
  body?: string | null;
  read_at?: string | null;
  created_at: string;
};

type Props = {
  initialUnread?: number;
};

export default function NotificationBell({ initialUnread = 0 }: Props) {
  const [items, setItems] = React.useState<Notification[]>([]);
  const [unread, setUnread] = React.useState(initialUnread);

  React.useEffect(() => {
    fetchNotifications();

    // Refresh notifications every 30 seconds
    const interval = setInterval(fetchNotifications, 30000);
    return () => clearInterval(interval);
  }, []);

  const fetchNotifications = async () => {
    try {
      const [ticketRes, budgetRes] = await Promise.all([
        fetch(route("ticket-notifications.index") + `?t=${Date.now()}`, {
          headers: { "Accept": "application/json", "X-Requested-With": "XMLHttpRequest" }
        }),
        fetch(route("weekly-budget-notifications.index") + `?t=${Date.now()}`, {
          headers: { "Accept": "application/json", "X-Requested-With": "XMLHttpRequest" }
        })
      ]);

      let ticketJson = { data: [], unread: 0 };
      let budgetJson = { data: [], unread: 0 };

      if (ticketRes.ok) {
        ticketJson = await ticketRes.json();
      }
      if (budgetRes.ok) {
        budgetJson = await budgetRes.json();
      }

      const combined = [...(ticketJson.data || []), ...(budgetJson.data || [])];
      combined.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

      setItems(combined.slice(0, 50));
      setUnread((ticketJson.unread || 0) + (budgetJson.unread || 0));
    } catch (e) {
      console.error("Failed to fetch notifications", e);
    }
  };

  const markRead = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    try {
      await Promise.all([
        fetch(route("ticket-notifications.mark-read"), {
          method: "POST",
          headers: { "X-CSRF-TOKEN": document.querySelector('meta[name="csrf-token"]')?.getAttribute('content') || "", "Accept": "application/json" },
        }),
        fetch(route("weekly-budget-notifications.mark-read"), {
          method: "POST",
          headers: { "X-CSRF-TOKEN": document.querySelector('meta[name="csrf-token"]')?.getAttribute('content') || "", "Accept": "application/json" },
        })
      ]);
      fetchNotifications();
    } catch (e) {
      console.error("Failed to mark read", e);
    }
  };

  const clear = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    try {
      await Promise.all([
        fetch(route("ticket-notifications.clear"), {
          method: "DELETE",
          headers: { "X-CSRF-TOKEN": document.querySelector('meta[name="csrf-token"]')?.getAttribute('content') || "", "Accept": "application/json" },
        }),
        fetch(route("weekly-budget-notifications.clear"), {
          method: "DELETE",
          headers: { "X-CSRF-TOKEN": document.querySelector('meta[name="csrf-token"]')?.getAttribute('content') || "", "Accept": "application/json" },
        })
      ]);
      fetchNotifications();
    } catch (e) {
      console.error("Failed to clear notifications", e);
    }
  };

  const handleNotificationClick = async (n: Notification) => {
    const isBudget = 'weekly_budget_id' in n || n.weekly_budget_id !== undefined;

    if (!n.read_at) {
      try {
        const markRoute = isBudget 
          ? route("weekly-budget-notifications.mark-read", n.id)
          : route("ticket-notifications.mark-read", n.id);

        await fetch(markRoute, {
          method: "POST",
          headers: {
            "X-CSRF-TOKEN": document.querySelector('meta[name="csrf-token"]')?.getAttribute('content') || "",
            "Accept": "application/json"
          },
        });
        
        setUnread(prev => Math.max(0, prev - 1));
        setItems(prev => prev.map(item => item.id === n.id && (isBudget ? item.weekly_budget_id === n.weekly_budget_id : item.ticket_id === n.ticket_id) ? { ...item, read_at: new Date().toISOString() } : item));
      } catch (e) {
        console.error("Failed to mark single notification as read", e);
      }
    }

    if (isBudget) {
      if (n.type === 'budget.finance') {
        router.visit(route('weekly-budget.finance'));
      } else if (n.type === 'budget.ceo') {
        router.visit(route('weekly-budget.ceo'));
      } else if (n.type === 'budget.department') {
        router.visit(route('weekly-budget.department'));
      } else {
        router.visit(route('weekly-budget.index'));
      }
    } else if (n.ticket_id) {
      router.visit(route('tickets.show', n.ticket_id));
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="relative h-9 w-9 rounded-full">
          <Bell className="h-5 w-5 text-muted-foreground" />
          {unread > 0 && (
            <span className="absolute top-1.5 right-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-red-600 text-[10px] font-bold text-white ring-2 ring-background">
              {unread > 9 ? '9+' : unread}
            </span>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80 p-0 shadow-xl border-none">
        <div className="flex items-center justify-between p-4 border-b">
          <h3 className="font-semibold text-sm">Notifications</h3>
          <div className="flex gap-2">
            <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-primary" title="Mark all as read" onClick={markRead}>
              <Check className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-red-500" title="Clear all" onClick={clear}>
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>
        <div className="max-h-[400px] overflow-y-auto">
          {items.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10 px-4 text-center">
              <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center mb-3 text-muted-foreground">
                <Bell className="h-5 w-5 opacity-40" />
              </div>
              <p className="text-sm font-medium text-foreground">All caught up!</p>
              <p className="text-xs text-muted-foreground mt-1">No new notifications for you right now.</p>
            </div>
          ) : (
            <div className="divide-y divide-muted/50">
              {items.map((n) => {
                const isBudget = 'weekly_budget_id' in n || n.weekly_budget_id !== undefined;
                return (
                <div
                  key={`${isBudget ? 'budget' : 'ticket'}-${n.id}`}
                  onClick={() => handleNotificationClick(n)}
                  className={`group relative flex gap-3 p-4 transition-colors hover:bg-muted/30 cursor-pointer ${!n.read_at ? "bg-primary/5" : "bg-card"}`}
                >
                  <div className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full border ${!n.read_at ? "bg-primary/10 border-primary/20 text-primary" : "bg-muted/50 border-muted text-muted-foreground"}`}>
                    <Info className="h-4 w-4" />
                  </div>
                  <div className="flex flex-col gap-1 overflow-hidden">
                    <p className={`text-sm leading-tight ${!n.read_at ? "font-bold text-foreground" : "font-medium text-muted-foreground"}`}>
                      {n.title}
                    </p>
                    {n.body && <p className="text-xs text-muted-foreground line-clamp-2">{n.body}</p>}
                    <div className="flex items-center gap-1.5 mt-1 text-[10px] text-muted-foreground">
                      <Clock className="h-3 w-3" />
                      {new Date(n.created_at).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                    </div>
                  </div>
                  {!n.read_at && (
                    <div className="absolute top-4 right-4 h-2 w-2 rounded-full bg-primary" />
                  )}
                </div>
              )})}
            </div>
          )}
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
