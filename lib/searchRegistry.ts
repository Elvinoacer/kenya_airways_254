type SearchItem = {
  id: string;
  title: string;
  description?: string;
  href?: string;
  tags?: string[];
};

const registry: SearchItem[] = [];

export function registerSearchItem(item: SearchItem) {
  registry.push(item);
}

export function listSearchItems() {
  return registry.slice();
}

// seed default items (home/admin/dashboard) safely
if (typeof globalThis !== "undefined") {
  try {
    registerSearchItem({ id: "home", title: "Home", href: "/" });
    registerSearchItem({ id: "admin", title: "Admin", href: "/admin" });
    registerSearchItem({
      id: "dashboard",
      title: "Dashboard",
      href: "/dashboard",
    });
  } catch (e) {}
}

export default { registerSearchItem, listSearchItems };
