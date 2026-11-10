import { V2Topbar } from '@/components/v2/shell/topbar';
import Link from 'next/link';

type DocLink = { slug: string; label: string; ru: string };

const SECTIONS: Array<{ title: string; titleRu: string; icon: string; docs: DocLink[] }> = [
  {
    title: 'Sales',
    titleRu: 'Продажи',
    icon: '🛒',
    docs: [
      { slug: 'sales-invoice', label: 'Sales Invoice', ru: 'Счёт-фактура' },
      { slug: 'payment-received', label: 'Payment Received', ru: 'Поступление денег' },
      { slug: 'bank-receipt', label: 'Bank Receipt', ru: 'Поступление на счёт' },
      { slug: 'return-invoice', label: 'Sales Return', ru: 'Возврат от покупателя' },
      { slug: 'refund-payment', label: 'Refund to Customer', ru: 'Возврат покупателю' },
    ],
  },
  {
    title: 'Purchases',
    titleRu: 'Закупки',
    icon: '📥',
    docs: [
      { slug: 'purchase-invoice', label: 'Purchase Invoice', ru: 'Поступление товаров' },
      { slug: 'payment-sent', label: 'Payment Sent', ru: 'Списание денег' },
      { slug: 'bank-payment', label: 'Bank Payment', ru: 'Платёж через банк' },
      { slug: 'return-purchase', label: 'Purchase Return', ru: 'Возврат поставщику' },
      { slug: 'refund-received', label: 'Refund Received', ru: 'Возврат от поставщика' },
    ],
  },
  {
    title: 'Inventory',
    titleRu: 'Склад',
    icon: '📦',
    docs: [
      { slug: 'inventory-count', label: 'Inventory Count', ru: 'Инвентаризация' },
      { slug: 'stock-adjustment', label: 'Stock Adjustment', ru: 'Корректировка запасов' },
      { slug: 'stock-transfer', label: 'Stock Transfer', ru: 'Перемещение' },
      { slug: 'price-setting', label: 'Price Setting', ru: 'Установка цен' },
    ],
  },
  {
    title: 'Treasury',
    titleRu: 'Казна',
    icon: '💰',
    docs: [
      { slug: 'cash-transfer', label: 'Cash Transfer', ru: 'Перемещение наличных' },
      { slug: 'bank-deposit', label: 'Bank Deposit', ru: 'Внесение наличных' },
      { slug: 'bank-withdrawal', label: 'Bank Withdrawal', ru: 'Снятие наличных' },
      // fx-revaluation lives under /admin/period-close/fx — not a regular doc
    ],
  },
];

export default function V2DocumentsHubPage() {
  const total = SECTIONS.reduce((n, s) => n + s.docs.length, 0);
  return (
    <>
      <V2Topbar
        breadcrumb="Documents"
        title="All Documents"
        subtitle={`Все документы · ${total} типов · нажмите чтобы создать`}
      />
      <div className="content">
        {SECTIONS.map((section) => (
          <section key={section.title} className="card" style={{ marginBottom: 16 }}>
            <div className="card-header">
              <div className="card-title">
                {section.icon} {section.title} · {section.titleRu}
                <span className="dim" style={{ marginLeft: 8, fontSize: 12 }}>
                  ({section.docs.length})
                </span>
              </div>
            </div>
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
                gap: 8,
                padding: 8,
              }}
            >
              {section.docs.map((doc) => (
                <Link
                  key={doc.slug}
                  href={`/documents/${doc.slug}/new`}
                  style={{
                    display: 'block',
                    padding: '12px 14px',
                    border: '1px solid var(--border)',
                    borderRadius: 8,
                    background: 'var(--surface)',
                    textDecoration: 'none',
                    color: 'var(--text)',
                    transition: 'border-color 0.15s, background 0.15s',
                  }}
                  className="hover-card"
                >
                  <div style={{ fontWeight: 600, fontSize: 14 }}>{doc.label}</div>
                  <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>
                    {doc.ru}
                  </div>
                  <div
                    style={{
                      fontSize: 11,
                      color: 'var(--text-dim)',
                      marginTop: 6,
                      fontFamily: 'monospace',
                    }}
                  >
                    /documents/{doc.slug}/new
                  </div>
                </Link>
              ))}
            </div>
          </section>
        ))}
      </div>
    </>
  );
}
