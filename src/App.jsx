const stats = [
  { label: 'إجمالي العقود', value: '128', trend: '+12%' },
  { label: 'العقود النشطة', value: '96', trend: '+8%' },
  { label: 'المتأخرات', value: '14', trend: '-3%' },
  { label: 'إجمالي الإيراد', value: '1,248,500', trend: '+15%' },
];

const alerts = [
  { type: 'warning', text: 'عقد رقم 204 تنتهي خلال 14 يومًا', time: 'اليوم' },
  { type: 'danger', text: 'دفعة متجر الرياض متأخرة 3 أيام', time: 'قبل 2 ساعة' },
  { type: 'info', text: 'تذكير قبل استحقاق دفعة رقم 7', time: 'غدًا' },
];

const contracts = [
  { id: 'LG-204', tenant: 'شركة النور', property: 'محل رقم 5', area: 'الرياض', endDate: '2026-10-15', status: 'نشط', payment: 'مكتمل' },
  { id: 'LG-188', tenant: 'مؤسسة الخليج', property: 'مكتب 2', area: 'جدة', endDate: '2026-09-28', status: 'قريب', payment: 'جزئي' },
  { id: 'LG-177', tenant: 'شركة المعالي', property: 'مخزن 8', area: 'الدمام', endDate: '2026-09-10', status: 'متأخر', payment: 'متأخر' },
  { id: 'LG-160', tenant: 'أحمد السلمي', property: 'محل 12', area: 'المدينة', endDate: '2026-11-02', status: 'نشط', payment: 'مكتمل' },
];

const payments = [
  { invoice: 'INV-1045', tenant: 'شركة النور', due: '2026-09-10', amount: '14,000', paid: '14,000', status: 'مدفوع' },
  { invoice: 'INV-1046', tenant: 'مؤسسة الخليج', due: '2026-09-15', amount: '11,500', paid: '8,500', status: 'جزئي' },
  { invoice: 'INV-1047', tenant: 'شركة المعالي', due: '2026-09-18', amount: '9,300', paid: '0', status: 'متأخر' },
  { invoice: 'INV-1048', tenant: 'أحمد السلمي', due: '2026-09-21', amount: '6,200', paid: '6,200', status: 'مدفوع' },
];

const tenants = [
  { name: 'شركة النور', id: '1234567890', nationality: 'سعودي', phone: '0501234567', company: 'شركة النور للتجارة', status: 'نشط' },
  { name: 'مؤسسة الخليج', id: '9876543210', nationality: 'سعودي', phone: '0559876543', company: 'مؤسسة الخليج', status: 'نشط' },
  { name: 'شركة المعالي', id: '4561237890', nationality: 'مصري', phone: '0543219876', company: 'شركة المعالي', status: 'متأخر' },
];

const reportRows = [
  { name: 'إيراد شهري', value: '528,000', color: 'green' },
  { name: 'متأخرات', value: '74,000', color: 'orange' },
  { name: 'عقود قريبة', value: '12', color: 'blue' },
  { name: 'مستحقات اليوم', value: '42,000', color: 'red' },
];

function App() {
  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand-box">
          <div className="brand-icon">E</div>
          <div>
            <h2>إيجارات</h2>
            <p>إدارة العقود</p>
          </div>
        </div>

        <nav className="nav-menu">
          <button className="nav-item active">لوحة التحكم</button>
          <button className="nav-item">العقود</button>
          <button className="nav-item">المستأجرون</button>
          <button className="nav-item">الدفعات</button>
          <button className="nav-item">المتابعة</button>
          <button className="nav-item">التقارير</button>
          <button className="nav-item">التنبيهات</button>
          <button className="nav-item">المرفقات</button>
          <button className="nav-item">الإعدادات</button>
        </nav>
      </aside>

      <main className="main-content">
        <header className="topbar">
          <div className="search-box">
            <span>⌕</span>
            <input type="text" placeholder="بحث سريع" />
          </div>

          <div className="topbar-actions">
            <button className="icon-btn">🔔</button>
            <button className="icon-btn">✉️</button>
            <div className="user-badge">
              <div className="avatar">م</div>
              <div>
                <strong>محمد</strong>
                <small>مدير النظام</small>
              </div>
            </div>
          </div>
        </header>

        <section className="hero-panel">
          <div>
            <p className="eyebrow">نظام متابعة العقود</p>
            <h1>لوحة التحكم الإدارية</h1>
          </div>
          <button className="primary-btn">+ إضافة عقد جديد</button>
        </section>

        <section className="stats-grid">
          {stats.map((stat) => (
            <article className="stat-card" key={stat.label}>
              <span>{stat.label}</span>
              <strong>{stat.value}</strong>
              <small>{stat.trend}</small>
            </article>
          ))}
        </section>

        <section className="content-grid">
          <div className="panel large-panel">
            <div className="panel-head">
              <h3>العقود الأخيرة</h3>
              <button className="link-btn">عرض الكل</button>
            </div>

            <table>
              <thead>
                <tr>
                  <th>رقم العقد</th>
                  <th>المستأجر</th>
                  <th>العقار</th>
                  <th>المنطقة</th>
                  <th>تاريخ الانتهاء</th>
                  <th>الحالة</th>
                  <th>الدفع</th>
                </tr>
              </thead>
              <tbody>
                {contracts.map((contract) => (
                  <tr key={contract.id}>
                    <td>{contract.id}</td>
                    <td>{contract.tenant}</td>
                    <td>{contract.property}</td>
                    <td>{contract.area}</td>
                    <td>{contract.endDate}</td>
                    <td>
                      <span className={`status-badge ${contract.status === 'نشط' ? 'success' : contract.status === 'قريب' ? 'warning' : 'danger'}`}>
                        {contract.status}
                      </span>
                    </td>
                    <td>
                      <span className={`status-badge ${contract.payment === 'مكتمل' ? 'success' : contract.payment === 'جزئي' ? 'warning' : 'danger'}`}>
                        {contract.payment}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="panel">
            <div className="panel-head">
              <h3>التنبيهات</h3>
              <button className="link-btn">جميع</button>
            </div>

            <div className="alerts-list">
              {alerts.map((alert, index) => (
                <div key={index} className={`alert-item ${alert.type}`}>
                  <div className="dot" />
                  <div>
                    <p>{alert.text}</p>
                    <small>{alert.time}</small>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="lower-grid">
          <div className="panel">
            <div className="panel-head">
              <h3>جدول الدفعات</h3>
              <button className="link-btn">تفاصيل</button>
            </div>

            <table className="mini-table">
              <thead>
                <tr>
                  <th>الفاتورة</th>
                  <th>المستأجر</th>
                  <th>تاريخ الاستحقاق</th>
                  <th>المبلغ</th>
                  <th>الحالة</th>
                </tr>
              </thead>
              <tbody>
                {payments.map((pay) => (
                  <tr key={pay.invoice}>
                    <td>{pay.invoice}</td>
                    <td>{pay.tenant}</td>
                    <td>{pay.due}</td>
                    <td>{pay.amount}</td>
                    <td>
                      <span className={`status-badge ${pay.status === 'مدفوع' ? 'success' : pay.status === 'جزئي' ? 'warning' : 'danger'}`}>
                        {pay.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="panel">
            <div className="panel-head">
              <h3>المستأجرون</h3>
              <button className="link-btn">عرض</button>
            </div>

            <div className="tenant-list">
              {tenants.map((tenant) => (
                <div className="tenant-item" key={tenant.id}>
                  <div className="tenant-info">
                    <strong>{tenant.name}</strong>
                    <small>{tenant.company}</small>
                  </div>
                  <span className={`mini-tag ${tenant.status === 'نشط' ? 'success' : 'danger'}`}>
                    {tenant.status}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="report-section">
          <div className="panel full-width-panel">
            <div className="panel-head">
              <h3>ملخص الأداء</h3>
            </div>

            <div className="report-grid">
              {reportRows.map((row) => (
                <div key={row.name} className={`report-card ${row.color}`}>
                  <span>{row.name}</span>
                  <strong>{row.value}</strong>
                </div>
              ))}
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}

export default App;
