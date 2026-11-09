export const PERMISSIONS = {
  "dashboard.view": "Panoyu görür",
  "reports.finance": "Ciro, kâr ve finansal raporları görür",
  "products.view": "Ürünleri görür",
  "products.edit": "Ürün ekler ve düzenler",
  "products.delete": "Ürün siler / arşivler",
  "products.cost": "Alış fiyatı ve kâr marjını görür",
  "catalog.manage": "Marka ve kategori yönetir",
  "inventory.manage": "Stok ve seri numarası yönetir",
  "orders.view": "Siparişleri görür",
  "orders.manage": "Sipariş durumunu ve kargoyu yönetir",
  "orders.refund": "İade ve iptal onaylar, para iadesi yapar",
  "campaigns.manage": "Kampanya ve kupon yönetir",
  "cms.manage": "Vitrin, banner, sayfa ve menü yönetir",
  "customers.view": "Müşterileri görür",
  "customers.manage": "Müşteri düzenler, not ekler",
  "inbox.manage": "Mesajları yanıtlar",
  "service.manage": "Servis kayıtlarını yönetir",
  "reviews.manage": "Yorum ve soruları onaylar / yanıtlar",
  "settings.manage": "Mağaza, kargo ve entegrasyon ayarları",
  "payments.manage": "Ödeme altyapısı anahtarları",
  "users.manage": "Ekip ve yetki yönetimi",
  "audit.view": "İşlem kayıtlarını görür",
} as const;

export type Permission = keyof typeof PERMISSIONS;
export const ALL_PERMISSIONS = Object.keys(PERMISSIONS) as Permission[];

export const PERMISSION_GROUPS: { label: string; items: Permission[] }[] = [
  { label: "Genel", items: ["dashboard.view", "reports.finance", "audit.view"] },
  { label: "Katalog", items: ["products.view", "products.edit", "products.delete", "products.cost", "catalog.manage", "inventory.manage"] },
  { label: "Satış", items: ["orders.view", "orders.manage", "orders.refund", "campaigns.manage"] },
  { label: "Müşteri", items: ["customers.view", "customers.manage", "inbox.manage", "service.manage", "reviews.manage"] },
  { label: "Vitrin ve sistem", items: ["cms.manage", "settings.manage", "payments.manage", "users.manage"] },
];

export const DEFAULT_ROLES: { key: string; name: string; description: string; permissions: Permission[] }[] = [
  { key: "admin", name: "Yönetici", description: "Her şeyi görür ve yönetir.", permissions: ALL_PERMISSIONS },
  {
    key: "sales",
    name: "Satış uzmanı",
    description: "Mesajlar, siparişler ve ürünler. Maliyet ve ciroyu görmez.",
    permissions: ["dashboard.view", "products.view", "orders.view", "orders.manage", "customers.view", "customers.manage", "inbox.manage", "reviews.manage"],
  },
  {
    key: "warehouse",
    name: "Depo ve kargo",
    description: "Hazırlanacak siparişler, stok ve seri numarası.",
    permissions: ["dashboard.view", "products.view", "inventory.manage", "orders.view", "orders.manage"],
  },
  {
    key: "service",
    name: "Teknik servis",
    description: "Sadece servis kayıtları ve ilgili müşteri.",
    permissions: ["dashboard.view", "service.manage", "customers.view"],
  },
];

export function can(perms: readonly string[] | undefined, p: Permission) {
  return !!perms?.includes(p);
}
