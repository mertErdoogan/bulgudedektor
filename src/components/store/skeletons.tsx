/**
 * Sayfa geçişi iskeletleri (route-skeleton.tsx). Tıklar tıklamaz gösterilir; sunucu cevabı gelince yerini
 * gerçek sayfa alır. Çok hızlı geçişlerde yanıp sönmesin diye ~120 ms gecikmeyle belirir (.skel-page).
 * Gerçek sayfaların ölçülerine yakın tutulur: içerik gelince sayfa zıplamaz.
 */

const Card = () => (
  <div className="flex flex-col overflow-hidden rounded-2xl border border-line bg-white">
    <div className="skel m-2 mb-0 aspect-[5/4] rounded-xl" />
    <div className="flex flex-col gap-2 p-4">
      <div className="skel h-3 w-16 rounded" />
      <div className="skel h-4 w-4/5 rounded" />
      <div className="skel mt-1 h-5 w-24 rounded" />
      <div className="skel mt-3 h-10 w-full rounded-full" />
    </div>
  </div>
);

/** Kategori, marka, arama, tüm ürünler, kampanyalar */
export function ListingSkeleton() {
  return (
    <div className="container-x pt-4 pb-16" aria-busy="true" aria-label="Sayfa yükleniyor">
      <div className="skel h-3.5 w-40 rounded" />
      <div className="skel mt-4 h-9 w-2/3 max-w-[520px] rounded-lg" />
      <div className="skel mt-3 h-4 w-1/2 max-w-[420px] rounded" />
      <div className="mt-6 grid gap-6 md:grid-cols-[250px_minmax(0,1fr)]">
        <div className="hidden flex-col gap-3 md:flex">
          {Array.from({ length: 6 }, (_, i) => <div key={i} className="skel h-10 rounded-lg" />)}
        </div>
        <div className="grid grid-cols-2 gap-3 md:gap-4 lg:grid-cols-3">
          {Array.from({ length: 6 }, (_, i) => <Card key={i} />)}
        </div>
      </div>
    </div>
  );
}

/** Ürün sayfası */
export function ProductSkeleton() {
  return (
    <div className="container-x pt-4 pb-24" aria-busy="true" aria-label="Ürün yükleniyor">
      <div className="skel h-3.5 w-56 rounded" />
      <div className="mt-4 grid gap-6 md:grid-cols-2 lg:gap-10">
        <div className="skel aspect-square rounded-2xl" />
        <div className="flex flex-col gap-3">
          <div className="skel h-3.5 w-32 rounded" />
          <div className="skel h-9 w-4/5 rounded-lg" />
          <div className="skel h-4 w-2/5 rounded" />
          <div className="skel mt-2 h-[120px] rounded-2xl" />
          <div className="skel h-12 rounded-lg" />
          <div className="skel h-12 rounded-lg" />
          <div className="skel mt-2 h-16 rounded-xl" />
        </div>
      </div>
    </div>
  );
}

/** Sepet */
export function CartSkeleton() {
  return (
    <div className="container-x pt-6 pb-16" aria-busy="true" aria-label="Sepet yükleniyor">
      <div className="skel h-9 w-40 rounded-lg" />
      <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1fr)_380px]">
        <div className="flex flex-col gap-3">
          {Array.from({ length: 2 }, (_, i) => <div key={i} className="skel h-[120px] rounded-2xl" />)}
        </div>
        <div className="skel h-[300px] rounded-2xl" />
      </div>
    </div>
  );
}

/** Rehber yazısı */
export function ArticleSkeleton() {
  return (
    <div className="container-x max-w-3xl pt-6 pb-16" aria-busy="true" aria-label="Yazı yükleniyor">
      <div className="skel h-3.5 w-32 rounded" />
      <div className="skel mt-4 h-10 w-full rounded-lg" />
      <div className="skel mt-2 h-10 w-2/3 rounded-lg" />
      <div className="skel mt-6 aspect-[16/9] rounded-2xl" />
      {Array.from({ length: 6 }, (_, i) => <div key={i} className={`skel mt-3 h-4 rounded ${i % 3 === 2 ? "w-3/5" : "w-full"}`} />)}
    </div>
  );
}

/** Diğer sayfalar (genel) */
export function PageSkeleton() {
  return (
    <div className="container-x pt-6 pb-16" aria-busy="true" aria-label="Sayfa yükleniyor">
      <div className="skel h-9 w-1/2 max-w-[460px] rounded-lg" />
      <div className="skel mt-4 h-4 w-2/3 max-w-[560px] rounded" />
      <div className="mt-8 grid grid-cols-2 gap-3 md:grid-cols-4 md:gap-4">
        {Array.from({ length: 4 }, (_, i) => <Card key={i} />)}
      </div>
    </div>
  );
}
