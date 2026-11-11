import type { Permission } from "@/lib/permissions";

export type NavItem = { href: string; label: string; icon: string; perm: Permission; badgeKey?: string };
export type NavGroup = { label: string; items: NavItem[] };

export const NAV: NavGroup[] = [
  {
    label: "",
    items: [
      { href: "/admin", label: "Pano", icon: "LayoutDashboard", perm: "dashboard.view" },
      { href: "/admin/isler", label: "İş listesi", icon: "ListChecks", perm: "dashboard.view", badgeKey: "myWork" },
    ],
  },
  {
    label: "Satış",
    items: [
      { href: "/admin/siparisler", label: "Siparişler", icon: "ShoppingBag", perm: "orders.view", badgeKey: "toPrepare" },
      { href: "/admin/iadeler", label: "İadeler", icon: "Undo2", perm: "orders.view", badgeKey: "returns" },
      { href: "/admin/kampanyalar", label: "Kampanyalar", icon: "BadgePercent", perm: "campaigns.manage" },
    ],
  },
  {
    label: "Katalog",
    items: [
      { href: "/admin/urunler", label: "Ürünler", icon: "Package", perm: "products.view" },
      { href: "/admin/markalar", label: "Markalar", icon: "Tag", perm: "catalog.manage" },
      { href: "/admin/kategoriler", label: "Kategoriler", icon: "FolderTree", perm: "catalog.manage" },
      { href: "/admin/stok", label: "Stok ve seri no", icon: "Boxes", perm: "inventory.manage", badgeKey: "lowStock" },
    ],
  },
  {
    label: "Müşteri",
    items: [
      { href: "/admin/musteriler", label: "Müşteriler", icon: "Users", perm: "customers.view" },
      { href: "/admin/mesajlar", label: "Mesajlar", icon: "MessageCircle", perm: "inbox.manage", badgeKey: "openMessages" },
      { href: "/admin/sablonlar", label: "Hazır yanıtlar", icon: "MessageSquareText", perm: "inbox.manage" },
      { href: "/admin/servis", label: "Servis", icon: "Wrench", perm: "service.manage", badgeKey: "openService" },
      { href: "/admin/yorumlar", label: "Yorum ve sorular", icon: "Star", perm: "reviews.manage", badgeKey: "pendingReviews" },
    ],
  },
  {
    label: "Vitrin",
    items: [
      { href: "/admin/vitrin", label: "Ana sayfa ve banner", icon: "LayoutTemplate", perm: "cms.manage" },
      { href: "/admin/sayfalar", label: "Sayfalar", icon: "FileText", perm: "cms.manage" },
      { href: "/admin/menuler", label: "Menüler", icon: "Menu", perm: "cms.manage" },
      { href: "/admin/medya", label: "Medya", icon: "Image", perm: "cms.manage" },
    ],
  },
  {
    label: "SEO ve içerik",
    items: [
      { href: "/admin/blog", label: "Blog ve rehberler", icon: "BookOpen", perm: "cms.manage" },
      { href: "/admin/sss", label: "SSS ve sözlük", icon: "CircleHelp", perm: "cms.manage" },
      { href: "/admin/seo", label: "SEO sağlığı", icon: "Gauge", perm: "cms.manage" },
      { href: "/admin/yonlendirmeler", label: "Yönlendirmeler", icon: "Signpost", perm: "cms.manage" },
    ],
  },
  {
    label: "Yönetim",
    items: [
      { href: "/admin/raporlar", label: "Raporlar", icon: "BarChart3", perm: "reports.finance" },
      { href: "/admin/ayarlar", label: "Ayarlar", icon: "Settings", perm: "settings.manage" },
      { href: "/admin/ekip", label: "Ekip ve yetkiler", icon: "ShieldCheck", perm: "users.manage" },
      { href: "/admin/kayitlar", label: "İşlem kayıtları", icon: "History", perm: "audit.view" },
    ],
  },
];
