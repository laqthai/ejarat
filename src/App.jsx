import { useEffect, useMemo, useState } from 'react';
import { supabase } from './lib/supabase';

const STORAGE_KEY = 'lease-dashboard-v2';
const LOGIN_KEY = 'lease-dashboard-auth';

const defaultData = {
  contracts: [],
  payments: [],
  tenants: [],
  documents: [],
  settings: {
    companyName: 'إيجارات السعودية',
    email: 'info@ejarat.sa',
    phone: '+966500000000',
    currency: 'SAR',
    alertBeforeEnd: 14,
    alertBeforeDue: 3,
    language: 'العربية'
  }
};

const navItems = [
  { key: 'dashboard', label: 'لوحة التحكم' },
  { key: 'contracts', label: 'العقود' },
  { key: 'tenants', label: 'المستأجرون' },
  { key: 'payments', label: 'الدفعات' },
  { key: 'alerts', label: 'التنبيهات' },
  { key: 'reports', label: 'التقارير' },
  { key: 'documents', label: 'المرفقات' },
  { key: 'settings', label: 'الإعدادات' }
];

const emptyContractForm = {
  tenant: '',
  phone: '',
  company: '',
  propertyType: 'محل تجاري',
  customPropertyType: '',
  property: '',
  address: '',
  mapUrl: '',
  startDate: '',
  endDate: '',
  rent: '',
  paymentCount: 12,
  propertyImage: null,
  contractFile: null,
  status: 'نشط'
};

const formatMoney = (value) => `${Number(value || 0).toLocaleString('en-US')} ر.س`;

const getStatusClass = (status) => {
  if (status === 'نشط' || status === 'مدفوع') return 'success';
  if (status === 'قريب' || status === 'جزئي' || status === 'مؤجل' || status === 'warning') return 'warning';
  return 'danger';
};

function App() {
  const [data, setData] = useState(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (!saved) return defaultData;

    try {
      return JSON.parse(saved);
    } catch {
      return defaultData;
    }
  });

  const [isLoggedIn, setIsLoggedIn] = useState(() => localStorage.getItem(LOGIN_KEY) === 'true');
  const [activePage, setActivePage] = useState('dashboard');
  const [selectedContractId, setSelectedContractId] = useState(data.contracts[0]?.id ?? null);
  const [selectedPaymentInvoice, setSelectedPaymentInvoice] = useState(data.payments[0]?.invoice ?? null);
  const [receiptPreview, setReceiptPreview] = useState(null);
  const [contractForm, setContractForm] = useState(emptyContractForm);
  const [editingContractId, setEditingContractId] = useState(null);
  const [paidAmountInput, setPaidAmountInput] = useState('');
  const [paymentAmountInput, setPaymentAmountInput] = useState('');
  const [paymentDueInput, setPaymentDueInput] = useState('');
  const [loginForm, setLoginForm] = useState({ username: 'admin', password: '' });
  const [loginMessage, setLoginMessage] = useState('');
  const [contractMessage, setContractMessage] = useState('');
  const [tenantMessage, setTenantMessage] = useState('');
  const [settingsForm, setSettingsForm] = useState(data.settings);
  const [settingsMessage, setSettingsMessage] = useState('');

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  }, [data]);

  useEffect(() => {
    if (!supabase) return;

    const loadCloudData = async () => {
      const [{ data: cloudContracts }, { data: cloudPayments }, { data: cloudTenants }] = await Promise.all([
        supabase.from('lease_contracts').select('id, payload'),
        supabase.from('lease_payments').select('id, payload'),
        supabase.from('lease_tenants').select('id, payload')
      ]);

      if (!cloudContracts && !cloudPayments && !cloudTenants) return;
      setData((prev) => ({
        ...prev,
        contracts: cloudContracts?.map((row) => row.payload) || prev.contracts,
        payments: cloudPayments?.map((row) => row.payload) || prev.payments,
        tenants: cloudTenants?.map((row) => row.payload) || prev.tenants
      }));
    };

    loadCloudData().catch(() => undefined);
  }, []);

  useEffect(() => {
    localStorage.setItem(LOGIN_KEY, String(isLoggedIn));
  }, [isLoggedIn]);

  const totalRevenue = useMemo(
    () => data.contracts.reduce((sum, contract) => sum + Number(contract.total || 0), 0),
    [data.contracts]
  );

  const totalPaid = useMemo(
    () => data.payments.reduce((sum, item) => sum + Number(item.paid || 0), 0),
    [data.payments]
  );

  const monthlyRevenue = useMemo(() => {
    const today = new Date();
    return data.payments.reduce((sum, payment) => {
      const referenceDate = new Date(payment.paidAt || payment.due);
      const isCurrentMonth = referenceDate.getFullYear() === today.getFullYear() && referenceDate.getMonth() === today.getMonth();
      return isCurrentMonth ? sum + Number(payment.paid || 0) : sum;
    }, 0);
  }, [data.payments]);

  const selectedContract = useMemo(
    () => data.contracts.find((item) => item.id === selectedContractId) ?? data.contracts[0],
    [data.contracts, selectedContractId]
  );

  const selectedPayment = useMemo(
    () => data.payments.find((item) => item.invoice === selectedPaymentInvoice) ?? data.payments[0],
    [data.payments, selectedPaymentInvoice]
  );

  const alertList = useMemo(() => {
    const list = [];

    data.contracts.forEach((contract) => {
      const end = new Date(contract.endDate);
      const today = new Date();
      const diffDays = Math.ceil((end - today) / (1000 * 60 * 60 * 24));

      if (diffDays <= 14 && diffDays >= 0) {
        list.push({ type: 'warning', text: `عقد ${contract.id} ينتهي خلال ${diffDays} يوم`, time: 'اليوم' });
      }

      if (contract.status === 'متأخر') {
        list.push({ type: 'danger', text: `العقد ${contract.id} متأخر في السداد`, time: 'مهم' });
      }
    });

    data.payments.forEach((payment) => {
      if (payment.status === 'متأخر') {
        list.push({ type: 'danger', text: `دفعة ${payment.invoice} متأخرة للمستأجر ${payment.tenant}`, time: 'مهم' });
      }
    });

    return list.slice(0, 5);
  }, [data]);

  const handleLogin = (event) => {
    event.preventDefault();

    if (loginForm.username === 'admin' && loginForm.password === '99776644') {
      setIsLoggedIn(true);
      setLoginMessage('');
      return;
    }

    setLoginMessage('اسم المستخدم أو كلمة المرور غير صحيحة');
  };

  const readFileAsDataUrl = (file, field) => {
    if (!file) return;

    if (file.size > 1.5 * 1024 * 1024) {
      setContractMessage('حجم الملف كبير. الحد الأقصى للمرفق 1.5 ميجابايت حالياً');
      return;
    }

    setContractForm((prev) => ({ ...prev, [field]: file }));
  };

  const uploadFile = async (file, folder) => {
    if (!file) return null;
    if (!supabase) throw new Error('إعدادات Supabase غير موجودة');

    const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '-');
    const path = `${folder}/${Date.now()}-${safeName}`;
    const { error } = await supabase.storage.from('lease-files').upload(path, file, {
      cacheControl: '3600',
      upsert: false
    });
    if (error) throw error;

    const { data: publicFile } = supabase.storage.from('lease-files').getPublicUrl(path);
    return { name: file.name, type: file.type, path, url: publicFile.publicUrl };
  };

  const syncContractToDatabase = async (contract, payments, tenant) => {
    if (!supabase) throw new Error('إعدادات Supabase غير موجودة');

    const operations = [
      supabase.from('lease_contracts').upsert({ id: contract.id, payload: contract }),
      supabase.from('lease_tenants').upsert({ id: tenant.id, payload: tenant }),
      ...payments.map((payment) => supabase.from('lease_payments').upsert({ id: payment.invoice, payload: payment }))
    ];
    const results = await Promise.all(operations);
    const failed = results.find((result) => result.error);
    if (failed?.error) throw failed.error;
  };

  const addMonths = (date, months) => {
    const nextDate = new Date(date);
    nextDate.setMonth(nextDate.getMonth() + months);
    return nextDate.toISOString().slice(0, 10);
  };

  const getAttachmentUrl = (attachment) => {
    if (!attachment) return '';
    if (typeof attachment === 'string') return attachment;
    return attachment.url || attachment.data || '';
  };

  const getMapUrl = (contract) => {
    if (contract.mapUrl) return contract.mapUrl;
    if (contract.latitude && contract.longitude) return `https://www.google.com/maps/search/?api=1&query=${contract.latitude},${contract.longitude}`;
    return '';
  };

  const startEditContract = (contract) => {
    const propertyOptions = ['محل تجاري', 'مكتب', 'مخزن', 'مستودع'];
    const isCustomProperty = !propertyOptions.includes(contract.propertyType);

    setEditingContractId(contract.id);
    setContractForm({
      ...emptyContractForm,
      tenant: contract.tenant || '',
      company: contract.company || '',
      propertyType: isCustomProperty ? 'أخرى' : contract.propertyType,
      customPropertyType: isCustomProperty ? contract.propertyType : '',
      property: contract.property || '',
      address: contract.address || '',
      mapUrl: contract.mapUrl || getMapUrl(contract),
      startDate: contract.startDate || '',
      endDate: contract.endDate || '',
      rent: contract.rent || contract.total || '',
      paymentCount: contract.paymentCount || 1,
      propertyImage: null,
      contractFile: null
    });
    setContractMessage('عدّل البيانات ثم اضغط حفظ التعديلات');
    setActivePage('contracts');
  };

  const savePaymentAmount = (invoice) => {
    const paid = Math.max(0, Number(paidAmountInput || 0));

    setData((prev) => ({
      ...prev,
      payments: prev.payments.map((payment) => {
        if (payment.invoice !== invoice) return payment;
        const safePaid = Math.min(paid, Number(payment.amount || 0));
        const status = safePaid >= Number(payment.amount || 0) ? 'مدفوع' : safePaid > 0 ? 'جزئي' : 'متأخر';
        return { ...payment, paid: safePaid, paidAt: safePaid > 0 ? new Date().toISOString().slice(0, 10) : null, status };
      }),
      contracts: prev.contracts.map((contract) => {
        const payment = prev.payments.find((item) => item.invoice === invoice);
        if (!payment || contract.tenant !== payment.tenant) return contract;
        const safePaid = Math.min(paid, Number(payment.amount || 0));
        return { ...contract, paymentStatus: safePaid >= Number(payment.amount || 0) ? 'مكتمل' : safePaid > 0 ? 'جزئي' : 'متأخر' };
      })
    }));
  };

  const savePaymentDetails = async (invoice) => {
    const amount = Math.max(0, Number(paymentAmountInput || 0));
    const due = paymentDueInput;
    if (!due || !amount) return;
    const currentPayment = data.payments.find((item) => item.invoice === invoice);
    if (!currentPayment) return;
    const paid = Math.min(Number(currentPayment.paid || 0), amount);
    const status = paid >= amount ? 'مدفوع' : paid > 0 ? 'جزئي' : 'متأخر';
    const updatedPayment = { ...currentPayment, amount, due, paid, status };

    setData((prev) => ({
      ...prev,
      payments: prev.payments.map((payment) => {
        if (payment.invoice !== invoice) return payment;
        return { ...updatedPayment, paidAt: paid > 0 ? new Date().toISOString().slice(0, 10) : null };
      })
    }));
    setPaidAmountInput('');

    if (supabase) {
      await supabase.from('lease_payments').upsert({ id: invoice, payload: updatedPayment });
    }
  };

  const addContract = async () => {
    setContractMessage('');
    if (!contractForm.tenant || !contractForm.property || !contractForm.address || !contractForm.startDate || !contractForm.endDate || !contractForm.rent) {
      setContractMessage('يرجى تعبئة الحقول الأساسية قبل حفظ العقد');
      return;
    }

    const rent = Number(contractForm.rent || 0);
    const propertyType = contractForm.propertyType === 'أخرى' ? contractForm.customPropertyType.trim() : contractForm.propertyType;
    if (!propertyType) {
      setContractMessage('اكتب نوع العقار عند اختيار أخرى');
      return;
    }
    const paymentCount = Math.max(1, Number(contractForm.paymentCount || 1));
    setContractMessage('جاري حفظ العقد ورفع المرفقات...');

    let uploadedImage;
    let uploadedContract;
    const uploadMessages = [];

    if (contractForm.propertyImage) {
      try {
        uploadedImage = await uploadFile(contractForm.propertyImage, 'property-images');
      } catch (error) {
        uploadMessages.push(`صورة العقار: ${error.message || 'تعذر الرفع'}`);
      }
    }

    if (contractForm.contractFile) {
      try {
        uploadedContract = await uploadFile(contractForm.contractFile, 'contracts');
      } catch (error) {
        uploadMessages.push(`ملف العقد: ${error.message || 'تعذر الرفع'}`);
      }
    }

    const existingContract = editingContractId
      ? data.contracts.find((contract) => contract.id === editingContractId)
      : null;
    const contractId = editingContractId || `LG-${Math.floor(Math.random() * 900 + 100)}`;
    const newContract = {
      id: contractId,
      tenant: contractForm.tenant,
      company: contractForm.company || 'مستأجر جديد',
      propertyType,
      property: contractForm.property,
      address: contractForm.address,
      mapUrl: contractForm.mapUrl,
      startDate: contractForm.startDate,
      endDate: contractForm.endDate,
      rent,
      total: rent,
      paymentCount,
      propertyImage: uploadedImage || existingContract?.propertyImage || null,
      contractFile: uploadedContract || existingContract?.contractFile || null,
      status: existingContract?.status || 'نشط',
      paymentStatus: existingContract?.paymentStatus || 'مكتمل'
    };

    const newPayments = Array.from({ length: paymentCount }, (_, index) => ({
      invoice: `INV-${Math.floor(Math.random() * 90000 + 10000)}-${index + 1}`,
      contractId: newContract.id,
      tenant: newContract.tenant,
      due: contractForm.startDate,
      amount: Math.round((rent / paymentCount) * 100) / 100,
      paid: 0,
      status: 'متأخر'
    }));

    const newTenant = {
      id: `ID-${Math.floor(Math.random() * 9000 + 1000)}`,
      name: contractForm.tenant,
      nationality: 'غير محدد',
      phone: contractForm.phone,
      company: contractForm.company || 'مستأجر جديد',
      status: 'نشط'
    };

    let databaseMessage = '';
    try {
      await syncContractToDatabase(newContract, newPayments, newTenant);
    } catch (error) {
      databaseMessage = `تعذر الحفظ في قاعدة البيانات: ${error.message || 'شغّل ملف إعداد قاعدة البيانات في Supabase'}`;
    }

    setData((prev) => ({
      ...prev,
      contracts: editingContractId
        ? prev.contracts.map((contract) => contract.id === editingContractId ? newContract : contract)
        : [newContract, ...prev.contracts],
      payments: editingContractId
        ? prev.payments.map((payment) => payment.contractId === editingContractId ? {
          ...payment,
          tenant: newContract.tenant,
          amount: Math.round((rent / paymentCount) * 100) / 100
        } : payment)
        : [...newPayments, ...prev.payments],
      tenants: [
        newTenant,
        ...prev.tenants
      ]
    }));

    setContractForm(emptyContractForm);
    setEditingContractId(null);
    setContractMessage(databaseMessage || (uploadMessages.length
      ? `تم حفظ العقد، لكن تعذر رفع ${uploadMessages.join(' و')}. تحقق من إعدادات Supabase ثم أعد إرفاقه.`
      : 'تم حفظ العقد وإنشاء جدول الدفعات'));
    setActivePage('contracts');
  };

  const saveSettings = () => {
    setData((prev) => ({ ...prev, settings: { ...prev.settings, ...settingsForm } }));
    setSettingsMessage('تم حفظ إعدادات الشركة بنجاح');
  };

  const approvePayment = (invoice) => {
    setData((prev) => ({
      ...prev,
      payments: prev.payments.map((payment) => {
        if (payment.invoice !== invoice) return payment;
        return { ...payment, status: 'مدفوع', paid: payment.amount, paidAt: new Date().toISOString().slice(0, 10) };
      }),
      contracts: prev.contracts.map((contract) => {
        const matched = prev.payments.find((payment) => payment.invoice === invoice);
        if (!matched) return contract;
        if (contract.tenant !== matched.tenant) return contract;
        return { ...contract, paymentStatus: 'مكتمل', status: 'نشط' };
      })
    }));
  };

  const postponePayment = (invoice, days = 7) => {
    setData((prev) => ({
      ...prev,
      payments: prev.payments.map((payment) => {
        if (payment.invoice !== invoice) return payment;

        const currentDate = new Date(payment.due);
        currentDate.setDate(currentDate.getDate() + days);

        return {
          ...payment,
          due: currentDate.toISOString().slice(0, 10),
          status: 'مؤجل'
        };
      }),
      contracts: prev.contracts.map((contract) => {
        const matched = prev.payments.find((payment) => payment.invoice === invoice);
        if (!matched || contract.tenant !== matched.tenant) return contract;
        return { ...contract, status: 'قريب', paymentStatus: 'مؤجل' };
      })
    }));
  };

  const deleteContract = async (contract) => {
    if (!window.confirm(`هل أنت متأكد من حذف العقد ${contract.id}؟ سيتم حذف دفعاته أيضاً.`)) return;

    setContractMessage('جاري حذف العقد...');
    try {
      if (supabase) {
        const { data: cloudPayments, error: paymentQueryError } = await supabase
          .from('lease_payments')
          .select('id, payload');
        if (paymentQueryError) throw paymentQueryError;

        const paymentIds = (cloudPayments || [])
          .filter((row) => row.payload?.contractId === contract.id)
          .map((row) => row.id);

        const { error: contractError } = await supabase.from('lease_contracts').delete().eq('id', contract.id);
        if (contractError) throw contractError;

        if (paymentIds.length) {
          const { error: paymentError } = await supabase.from('lease_payments').delete().in('id', paymentIds);
          if (paymentError) throw paymentError;
        }

        const paths = [contract.propertyImage?.path, contract.contractFile?.path].filter(Boolean);
        if (paths.length) await supabase.storage.from('lease-files').remove(paths);
      }

      setData((prev) => ({
        ...prev,
        contracts: prev.contracts.filter((item) => item.id !== contract.id),
        payments: prev.payments.filter((item) => item.contractId !== contract.id)
      }));
      setSelectedContractId(null);
      setActivePage('contracts');
      setContractMessage('تم حذف العقد ودفعاته بنجاح');
    } catch (error) {
      setContractMessage(`تعذر حذف العقد: ${error.message || 'تحقق من اتصال Supabase'}`);
    }
  };

  const deleteTenant = async (tenant) => {
    const hasContracts = data.contracts.some((contract) => contract.tenant === tenant.name);
    if (hasContracts) {
      setTenantMessage('لا يمكن حذف هذا المستأجر لأنه مرتبط بعقد. احذف العقد أولاً.');
      return;
    }
    if (!window.confirm(`هل أنت متأكد من حذف المستأجر ${tenant.name}؟`)) return;

    setTenantMessage('جاري حذف المستأجر...');
    try {
      if (supabase) {
        const { error } = await supabase.from('lease_tenants').delete().eq('id', tenant.id);
        if (error) throw error;
      }
      setData((prev) => ({
        ...prev,
        tenants: prev.tenants.filter((item) => item.id !== tenant.id)
      }));
      setTenantMessage('تم حذف المستأجر بنجاح');
    } catch (error) {
      setTenantMessage(`تعذر حذف المستأجر: ${error.message || 'تحقق من اتصال Supabase'}`);
    }
  };

  const renderDashboard = () => (
    <>
      <section className="hero-panel">
        <div>
          <p className="eyebrow">نظام متابعة العقود</p>
          <h1>لوحة التحكم الإدارية</h1>
        </div>
        <button className="primary-btn" onClick={() => setActivePage('contracts')}>+ إضافة عقد جديد</button>
      </section>

      <section className="stats-grid">
        <article className="stat-card">
          <span>إجمالي العقود</span>
          <strong>{data.contracts.length}</strong>
          <small>+12%</small>
        </article>
        <article className="stat-card">
          <span>العقود النشطة</span>
          <strong>{data.contracts.filter((item) => item.status === 'نشط').length}</strong>
          <small>+8%</small>
        </article>
        <article className="stat-card">
          <span>المتأخرات</span>
          <strong>{data.contracts.filter((item) => item.status === 'متأخر').length}</strong>
          <small>-3%</small>
        </article>
        <article className="stat-card">
          <span>إجمالي الإيراد</span>
          <strong>{formatMoney(totalRevenue)}</strong>
          <small>+15%</small>
        </article>
      </section>

      <section className="content-grid">
        <div className="panel large-panel">
          <div className="panel-head">
            <h3>العقود الأخيرة</h3>
            <button className="link-btn" onClick={() => setActivePage('contracts')}>عرض الكل</button>
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
              {data.contracts.slice(0, 4).map((contract) => (
                <tr key={contract.id}>
                  <td>{contract.id}</td>
                  <td>{contract.tenant}</td>
                  <td>{contract.property}</td>
                  <td>{contract.address}</td>
                  <td>{contract.endDate}</td>
                  <td><span className={`status-badge ${getStatusClass(contract.status)}`}>{contract.status}</span></td>
                  <td><span className={`status-badge ${getStatusClass(contract.paymentStatus)}`}>{contract.paymentStatus}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="panel">
          <div className="panel-head">
            <h3>التنبيهات</h3>
            <button className="link-btn" onClick={() => setActivePage('alerts')}>جميع</button>
          </div>

          <div className="alerts-list">
            {alertList.map((alert, index) => (
              <div key={`${alert.text}-${index}`} className={`alert-item ${alert.type}`}>
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
            <button className="link-btn" onClick={() => setActivePage('payments')}>تفاصيل</button>
          </div>

          <table>
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
              {data.payments.map((pay) => (
                <tr key={pay.invoice}>
                  <td>{pay.invoice}</td>
                  <td>{pay.tenant}</td>
                  <td>{pay.due}</td>
                  <td>{formatMoney(pay.amount)}</td>
                  <td><span className={`status-badge ${getStatusClass(pay.status)}`}>{pay.status}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="panel">
          <div className="panel-head">
            <h3>المستأجرون</h3>
            <button className="link-btn" onClick={() => setActivePage('tenants')}>عرض</button>
          </div>

          <div className="tenant-list">
            {data.tenants.slice(0, 4).map((tenant) => (
              <div className="tenant-item" key={tenant.id}>
                <div className="tenant-info">
                  <strong>{tenant.name}</strong>
                  <small>{tenant.company}</small>
                </div>
                <span className={`mini-tag ${tenant.status === 'نشط' ? 'success' : 'danger'}`}>{tenant.status}</span>
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
            <div className="report-card green">
              <span>إيراد شهري</span>
              <strong>{formatMoney(monthlyRevenue)}</strong>
            </div>
            <div className="report-card orange">
              <span>متأخرات</span>
              <strong>{formatMoney(74000)}</strong>
            </div>
            <div className="report-card blue">
              <span>عقود قريبة</span>
              <strong>{12}</strong>
            </div>
            <div className="report-card red">
              <span>مستحقات اليوم</span>
              <strong>{formatMoney(42000)}</strong>
            </div>
          </div>
        </div>
      </section>
    </>
  );

  const renderContractDetail = () => {
    if (!selectedContract) {
      return (
        <div className="page-block">
          <div className="panel">
            <h3>لا يوجد عقد محدد</h3>
          </div>
        </div>
      );
    }

    return (
      <div className="page-block">
        <div className="section-header">
          <h2>تفاصيل العقد</h2>
          <div className="inline-actions">
            <button className="secondary-btn small" onClick={() => setActivePage('contracts')}>العودة</button>
            <button className="primary-btn small" onClick={() => startEditContract(selectedContract)}>تحديث البيانات</button>
            <button className="table-btn danger-btn" onClick={() => deleteContract(selectedContract)}>حذف العقد</button>
          </div>
        </div>

        <div className="detail-summary">
          <div className="panel detail-panel">
            <div className="detail-header">
              <div>
                <p className="eyebrow">رقم العقد</p>
                <h3>{selectedContract.id}</h3>
              </div>
              <span className={`status-badge ${getStatusClass(selectedContract.status)}`}>{selectedContract.status}</span>
            </div>

            <div className="detail-grid">
              <div><span>اسم المستأجر</span><strong>{selectedContract.tenant}</strong></div>
              <div><span>اسم الشركة</span><strong>{selectedContract.company}</strong></div>
              <div><span>نوع العقار</span><strong>{selectedContract.propertyType}</strong></div>
              <div><span>اسم العقار</span><strong>{selectedContract.property}</strong></div>
              <div><span>العنوان</span><strong>{selectedContract.address}</strong></div>
              <div><span>تاريخ البداية</span><strong>{selectedContract.startDate}</strong></div>
              <div><span>تاريخ النهاية</span><strong>{selectedContract.endDate}</strong></div>
              <div><span>قيمة العقد</span><strong>{formatMoney(selectedContract.total)}</strong></div>
              <div><span>عدد الدفعات</span><strong>{selectedContract.paymentCount || 'غير محدد'}</strong></div>
            </div>
          </div>

          <div className="panel">
            <h3>خريطة العقار</h3>
            {getAttachmentUrl(selectedContract.propertyImage) && <img src={getAttachmentUrl(selectedContract.propertyImage)} alt="صورة العقار" className="property-image" />}
            <div className="map-box">
              <span>📍</span>
              <p>{selectedContract.address}</p>
            </div>
            <div className="form-grid small-gap">
              <label><span>رابط Google Maps</span><input type="text" value={getMapUrl(selectedContract) || 'غير محدد'} readOnly /></label>
            </div>
            {getMapUrl(selectedContract) && (
              <a className="primary-btn small map-link" href={getMapUrl(selectedContract)} target="_blank" rel="noreferrer">فتح الموقع في Google Maps</a>
            )}
            {selectedContract.contractFile && (
              <a className="uploaded-file detail-file" href={getAttachmentUrl(selectedContract.contractFile)} target="_blank" rel="noreferrer">
                فتح ملف العقد: {selectedContract.contractFile.name || 'المرفق'}
              </a>
            )}
          </div>
        </div>

        <div className="detail-bottom-grid">
          <div className="panel">
            <div className="panel-head">
              <h3>الدفعات</h3>
            </div>
            <table>
              <thead>
                <tr>
                  <th>الدفعة</th>
                  <th>المبلغ</th>
                  <th>الحالة</th>
                  <th>إجراءات</th>
                </tr>
              </thead>
              <tbody>
                {data.payments.filter((payment) => payment.tenant === selectedContract.tenant).map((payment) => (
                  <tr key={payment.invoice}>
                    <td>{payment.invoice}</td>
                    <td>{formatMoney(payment.amount)}</td>
                    <td><span className={`status-badge ${getStatusClass(payment.status)}`}>{payment.status}</span></td>
                    <td>
                      <div className="mini-actions">
                        <button className="table-btn" onClick={() => setReceiptPreview(payment)}>السند</button>
                        <button className="table-btn success-btn" onClick={() => approvePayment(payment.invoice)}>اعتماد</button>
                        <button className="table-btn warning-btn" onClick={() => postponePayment(payment.invoice, 7)}>تاجيل</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="panel">
            <div className="panel-head">
              <h3>المستندات</h3>
            </div>

            <div className="document-list">
              {data.documents.slice(0, 3).map((doc) => (
                <div className="document-item" key={doc.name}>
                  <span>📄</span>
                  <div>
                    <strong>{doc.name}</strong>
                    <small>{doc.type}</small>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {receiptPreview && (
          <div className="panel receipt-panel">
            <div className="panel-head">
              <h3>عرض السند</h3>
              <button className="link-btn" onClick={() => setReceiptPreview(null)}>إغلاق</button>
            </div>
            <div className="receipt-box">
              <div className="receipt-head">
                <strong>سند تحويل</strong>
                <span>{receiptPreview.invoice}</span>
              </div>
              <div className="receipt-info">
                <div><span>المستأجر</span><strong>{receiptPreview.tenant}</strong></div>
                <div><span>تاريخ الاستحقاق</span><strong>{receiptPreview.due}</strong></div>
                <div><span>المبلغ</span><strong>{formatMoney(receiptPreview.amount)}</strong></div>
                <div><span>الحالة</span><strong>{receiptPreview.status}</strong></div>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  };

  const renderPaymentDetail = () => {
    if (!selectedPayment) {
      return (
        <div className="page-block">
          <div className="panel">
            <h3>لا توجد دفعة محددة</h3>
          </div>
        </div>
      );
    }

    return (
      <div className="page-block">
        <div className="section-header">
          <h2>تفاصيل الدفعة</h2>
          <div className="inline-actions">
            <button className="secondary-btn small" onClick={() => setActivePage('payments')}>العودة</button>
          </div>
        </div>

        <div className="detail-summary">
          <div className="panel detail-panel">
            <div className="detail-header">
              <div>
                <p className="eyebrow">رقم الفاتورة</p>
                <h3>{selectedPayment.invoice}</h3>
              </div>
              <span className={`status-badge ${getStatusClass(selectedPayment.status)}`}>{selectedPayment.status}</span>
            </div>

            <div className="detail-grid">
              <div><span>اسم المستأجر</span><strong>{selectedPayment.tenant}</strong></div>
              <div><span>تاريخ الاستحقاق</span><strong>{selectedPayment.due}</strong></div>
              <div><span>مبلغ العقد</span><strong>{formatMoney(selectedPayment.amount)}</strong></div>
              <div><span>المبلغ المدفوع</span><strong>{formatMoney(selectedPayment.paid)}</strong></div>
              <div><span>المتبقي</span><strong>{formatMoney(Math.max(selectedPayment.amount - selectedPayment.paid, 0))}</strong></div>
              <div><span>الحالة</span><strong>{selectedPayment.status}</strong></div>
            </div>

            <div className="payment-edit-form">
              <label>
                <span>مبلغ الدفعة</span>
                <input type="number" min="0" value={paymentAmountInput === '' ? selectedPayment.amount : paymentAmountInput} onChange={(event) => setPaymentAmountInput(event.target.value)} />
              </label>
              <label>
                <span>تاريخ الاستحقاق</span>
                <input type="date" value={paymentDueInput || selectedPayment.due} onChange={(event) => setPaymentDueInput(event.target.value)} />
              </label>
              <button className="primary-btn small" onClick={() => savePaymentDetails(selectedPayment.invoice)}>حفظ تفاصيل الدفعة</button>
            </div>

            <div className="paid-amount-form">
              <label>
                <span>المبلغ المدفوع فعلياً</span>
                <input
                  type="number"
                  min="0"
                  max={selectedPayment.amount}
                  value={paidAmountInput === '' ? selectedPayment.paid : paidAmountInput}
                  onChange={(event) => setPaidAmountInput(event.target.value)}
                />
              </label>
              <button className="primary-btn small" onClick={() => savePaymentAmount(selectedPayment.invoice)}>حفظ المبلغ</button>
            </div>

            <div className="payment-action-box">
              <button className="table-btn" onClick={() => setReceiptPreview(selectedPayment)}>السند</button>
              <button className="table-btn success-btn" onClick={() => approvePayment(selectedPayment.invoice)}>اعتماد التحصيل</button>
              <button className="table-btn warning-btn" onClick={() => postponePayment(selectedPayment.invoice, 7)}>تاجيل الدفع</button>
            </div>
          </div>

          <div className="panel">
            <h3>معلومات السداد</h3>
            <div className="map-box">
              <span>💳</span>
              <p>مراجعة ومتابعة حالة الدفع</p>
            </div>
            <div className="form-grid small-gap">
              <label><span>طريقة الدفع</span><input type="text" value="حوالة بنكية" readOnly /></label>
              <label><span>رقم المرجع</span><input type="text" value={selectedPayment.invoice} readOnly /></label>
            </div>
          </div>
        </div>

        {receiptPreview && (
          <div className="panel receipt-panel">
            <div className="panel-head">
              <h3>عرض السند</h3>
              <button className="link-btn" onClick={() => setReceiptPreview(null)}>إغلاق</button>
            </div>
            <div className="receipt-box">
              <div className="receipt-head">
                <strong>سند تحويل</strong>
                <span>{receiptPreview.invoice}</span>
              </div>
              <div className="receipt-info">
                <div><span>المستأجر</span><strong>{receiptPreview.tenant}</strong></div>
                <div><span>تاريخ الاستحقاق</span><strong>{receiptPreview.due}</strong></div>
                <div><span>المبلغ</span><strong>{formatMoney(receiptPreview.amount)}</strong></div>
                <div><span>الحالة</span><strong>{receiptPreview.status}</strong></div>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  };

  const renderContracts = () => (
    <div className="page-block">
      <div className="section-header">
        <h2>إدارة العقود</h2>
        <button className="primary-btn small" onClick={() => setActivePage('dashboard')}>العودة</button>
      </div>

      <div className="panel full-width-panel">
        <table>
          <thead>
            <tr>
              <th>رقم العقد</th>
              <th>المستأجر</th>
              <th>العقار</th>
              <th>العنوان</th>
              <th>تاريخ الانتهاء</th>
              <th>قيمة العقد</th>
              <th>الحالة</th>
              <th>التفاصيل</th>
            </tr>
          </thead>
          <tbody>
            {data.contracts.map((contract) => (
              <tr key={contract.id}>
                <td>{contract.id}</td>
                <td>{contract.tenant}</td>
                <td>{contract.property}</td>
                <td>{contract.address}</td>
                <td>{contract.endDate}</td>
                <td>{formatMoney(contract.total)}</td>
                <td><span className={`status-badge ${getStatusClass(contract.status)}`}>{contract.status}</span></td>
                <td>
                  <div className="mini-actions">
                    <button
                      className="table-btn"
                      onClick={() => {
                        setSelectedContractId(contract.id);
                        setActivePage('contract-detail');
                      }}
                    >عرض</button>
                    <button className="table-btn danger-btn" onClick={() => deleteContract(contract)}>حذف</button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="panel mt-20">
        <h3>{editingContractId ? 'تعديل العقد' : 'إضافة عقد جديد'}</h3>
        <div className="grid-two">
          <label>
            <span>اسم المستأجر</span>
            <input type="text" value={contractForm.tenant} onChange={(e) => setContractForm({ ...contractForm, tenant: e.target.value })} />
          </label>
          <label>
            <span>رقم جوال المستأجر</span>
            <input type="tel" inputMode="tel" value={contractForm.phone} onChange={(e) => setContractForm({ ...contractForm, phone: e.target.value })} />
          </label>
          <label>
            <span>اسم الشركة أو المؤسسة</span>
            <input type="text" value={contractForm.company} onChange={(e) => setContractForm({ ...contractForm, company: e.target.value })} />
          </label>
          <label>
            <span>نوع العقار</span>
            <select value={contractForm.propertyType} onChange={(e) => setContractForm({ ...contractForm, propertyType: e.target.value })}>
              <option value="محل تجاري">محل تجاري</option>
              <option value="مكتب">مكتب</option>
              <option value="مخزن">مخزن</option>
              <option value="مستودع">مستودع</option>
              <option value="أخرى">أخرى</option>
            </select>
          </label>
          {contractForm.propertyType === 'أخرى' && (
            <label>
              <span>اكتب نوع العقار</span>
              <input type="text" value={contractForm.customPropertyType} onChange={(e) => setContractForm({ ...contractForm, customPropertyType: e.target.value })} />
            </label>
          )}
          <label>
            <span>اسم العقار</span>
            <input type="text" value={contractForm.property} onChange={(e) => setContractForm({ ...contractForm, property: e.target.value })} />
          </label>
          <label>
            <span>العنوان</span>
            <input type="text" value={contractForm.address} onChange={(e) => setContractForm({ ...contractForm, address: e.target.value })} />
          </label>
          <label>
            <span>رابط موقع العقار في Google Maps</span>
            <input type="url" placeholder="https://maps.google.com/..." value={contractForm.mapUrl} onChange={(e) => setContractForm({ ...contractForm, mapUrl: e.target.value })} />
          </label>
          <label>
            <span>تاريخ بداية العقد</span>
            <input type="date" value={contractForm.startDate} onChange={(e) => setContractForm({ ...contractForm, startDate: e.target.value })} />
          </label>
          <label>
            <span>تاريخ انتهاء العقد</span>
            <input type="date" value={contractForm.endDate} onChange={(e) => setContractForm({ ...contractForm, endDate: e.target.value })} />
          </label>
          <label>
            <span>قيمة العقد</span>
            <input type="number" value={contractForm.rent} onChange={(e) => setContractForm({ ...contractForm, rent: e.target.value })} />
          </label>
          <label>
            <span>عدد الدفعات</span>
            <input type="number" min="1" value={contractForm.paymentCount} onChange={(e) => setContractForm({ ...contractForm, paymentCount: e.target.value })} />
          </label>
          <label>
            <span>صورة العقار</span>
            <input type="file" accept="image/*" onChange={(e) => readFileAsDataUrl(e.target.files?.[0], 'propertyImage')} />
          </label>
          <label>
            <span>ملف العقد</span>
            <input type="file" accept=".pdf,.doc,.docx,image/*" onChange={(e) => readFileAsDataUrl(e.target.files?.[0], 'contractFile')} />
          </label>
        </div>

        {contractMessage && <div className="form-message">{contractMessage}</div>}

        {(contractForm.propertyImage || contractForm.contractFile) && (
          <div className="upload-preview-row">
            {contractForm.propertyImage && <img src={URL.createObjectURL(contractForm.propertyImage)} alt="معاينة صورة العقار" className="property-thumb" />}
            {contractForm.contractFile && <span className="uploaded-file">تم اختيار: {contractForm.contractFile.name}</span>}
          </div>
        )}

        <div className="form-actions mt-20">
          <button className="primary-btn small" onClick={addContract}>{editingContractId ? 'حفظ التعديلات' : 'حفظ العقد'}</button>
          <button className="secondary-btn small" onClick={() => { setContractForm(emptyContractForm); setEditingContractId(null); setContractMessage(''); }}>إلغاء</button>
        </div>
      </div>
    </div>
  );

  const renderTenants = () => (
    <div className="page-block">
      <div className="section-header">
        <h2>المستأجرون</h2>
        <button className="primary-btn small" onClick={() => setActivePage('contracts')}>+ إضافة مستأجر</button>
      </div>

      {tenantMessage && <div className="form-message">{tenantMessage}</div>}

      <div className="tenant-grid">
        {data.tenants.map((tenant) => (
          <div className="tenant-card panel" key={tenant.id}>
            <div className="tenant-card-head">
              <div>
                <strong>{tenant.name}</strong>
                <small>{tenant.company}</small>
              </div>
              <span className={`mini-tag ${tenant.status === 'نشط' ? 'success' : 'danger'}`}>{tenant.status}</span>
            </div>
            <ul className="tenant-meta">
              <li><span>رقم الهوية</span><strong>{tenant.id}</strong></li>
              <li><span>الجنسية</span><strong>{tenant.nationality}</strong></li>
              <li><span>الجوال</span><strong>{tenant.phone}</strong></li>
            </ul>
            <button className="table-btn danger-btn" onClick={() => deleteTenant(tenant)}>حذف المستأجر</button>
          </div>
        ))}
      </div>
    </div>
  );

  const renderPayments = () => (
    <div className="page-block">
      <div className="section-header">
        <h2>جدول الدفعات</h2>
        <button className="primary-btn small" onClick={() => setActivePage('contracts')}>+ إضافة دفعة</button>
      </div>

      <div className="panel full-width-panel">
        <table>
          <thead>
            <tr>
              <th>الفاتورة</th>
              <th>المستأجر</th>
              <th>تاريخ الاستحقاق</th>
              <th>المبلغ</th>
              <th>المدفوع</th>
              <th>الحالة</th>
              <th>الإجراءات</th>
            </tr>
          </thead>
          <tbody>
            {data.payments.map((pay) => (
              <tr key={pay.invoice}>
                <td>{pay.invoice}</td>
                <td>{pay.tenant}</td>
                <td>{pay.due}</td>
                <td>{formatMoney(pay.amount)}</td>
                <td>{formatMoney(pay.paid)}</td>
                <td><span className={`status-badge ${getStatusClass(pay.status)}`}>{pay.status}</span></td>
                <td>
                  <div className="mini-actions">
                    <button
                      className="table-btn"
                      onClick={() => {
                        setSelectedPaymentInvoice(pay.invoice);
                        setPaymentAmountInput(String(pay.amount || 0));
                        setPaymentDueInput(pay.due || '');
                        setPaidAmountInput(String(pay.paid || 0));
                        setActivePage('payment-detail');
                      }}
                    >
                      عرض
                    </button>
                    <button className="table-btn success-btn" onClick={() => approvePayment(pay.invoice)}>اعتماد</button>
                    <button className="table-btn warning-btn" onClick={() => postponePayment(pay.invoice, 7)}>تاجيل</button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );

  const renderAlerts = () => (
    <div className="page-block">
      <div className="section-header">
        <h2>التنبيهات</h2>
        <button className="primary-btn small">إرسال تنبيه</button>
      </div>

      <div className="alert-layout">
        <div className="panel">
          <div className="panel-head">
            <h3>التنبيهات الحالية</h3>
          </div>
          <div className="alerts-list">
            {alertList.map((alert, index) => (
              <div key={`${alert.text}-${index}`} className={`alert-item ${alert.type}`}>
                <div className="dot" />
                <div>
                  <p>{alert.text}</p>
                  <small>{alert.time}</small>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="panel">
          <div className="panel-head">
            <h3>إعداد التنبيهات</h3>
          </div>
          <div className="form-grid">
            <label><span>تنبيه قبل انتهاء العقد</span><input type="text" value="14 يوم" readOnly /></label>
            <label><span>تنبيه قبل الاستحقاق</span><input type="text" value="3 أيام" readOnly /></label>
            <label><span>تذكير عبر</span><input type="text" value="SMS + بريد + داخل النظام" readOnly /></label>
            <label><span>حد التأخير</span><input type="text" value="2 يوم" readOnly /></label>
          </div>
        </div>
      </div>
    </div>
  );

  const renderReports = () => {
    const overduePayments = data.payments.filter((payment) => payment.status === 'متأخر' || payment.status === 'جزئي');
    const overdueTotal = overduePayments.reduce((sum, payment) => sum + Math.max(Number(payment.amount || 0) - Number(payment.paid || 0), 0), 0);

    return (
      <div className="page-block">
      <div className="section-header">
        <h2>التقارير</h2>
        <button className="primary-btn small">تصدير PDF</button>
      </div>

      <div className="report-grid large">
        <div className="report-card green">
          <span>إيراد شهري</span>
          <strong>{formatMoney(monthlyRevenue)}</strong>
        </div>
        <div className="report-card orange">
          <span>متأخرات</span>
          <strong>{formatMoney(overdueTotal)}</strong>
        </div>
        <div className="report-card blue">
          <span>عقود قريبة</span>
          <strong>{data.contracts.filter((item) => item.status === 'قريب').length}</strong>
        </div>
        <div className="report-card red">
          <span>إجمالي المدفوع</span>
          <strong>{formatMoney(totalPaid)}</strong>
        </div>
      </div>

      <div className="panel mt-20">
        <table>
          <thead>
            <tr>
              <th>اسم التقرير</th>
              <th>الفترة</th>
              <th>الإجمالي</th>
              <th>الحالة</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>تقرير العقود النشطة</td>
              <td>شهر سبتمبر</td>
              <td>{formatMoney(totalRevenue)}</td>
              <td><span className="status-badge success">جاهز</span></td>
            </tr>
            <tr>
              <td>تقرير المتأخرات</td>
              <td>شهر سبتمبر</td>
              <td>{formatMoney(overdueTotal)}</td>
              <td><button className="table-btn" onClick={() => setActivePage('payments')}>عرض التفاصيل</button></td>
            </tr>
          </tbody>
        </table>
      </div>

      <div className="panel full-width-panel">
        <div className="panel-head">
          <h3>تفاصيل المتأخرات والدفعات الجزئية</h3>
          <span className="status-badge warning">{overduePayments.length} دفعة</span>
        </div>
        {overduePayments.length ? (
          <table>
            <thead>
              <tr>
                <th>الفاتورة</th>
                <th>المستأجر</th>
                <th>الاستحقاق</th>
                <th>المطلوب</th>
                <th>المدفوع</th>
                <th>المتبقي</th>
                <th>الحالة</th>
                <th>الإجراء</th>
              </tr>
            </thead>
            <tbody>
              {overduePayments.map((payment) => (
                <tr key={payment.invoice}>
                  <td>{payment.invoice}</td>
                  <td>{payment.tenant}</td>
                  <td>{payment.due}</td>
                  <td>{formatMoney(payment.amount)}</td>
                  <td>{formatMoney(payment.paid)}</td>
                  <td>{formatMoney(Math.max(Number(payment.amount || 0) - Number(payment.paid || 0), 0))}</td>
                  <td><span className={`status-badge ${getStatusClass(payment.status)}`}>{payment.status}</span></td>
                  <td><button className="table-btn" onClick={() => { setSelectedPaymentInvoice(payment.invoice); setPaymentAmountInput(String(payment.amount || 0)); setPaymentDueInput(payment.due || ''); setPaidAmountInput(String(payment.paid || 0)); setActivePage('payment-detail'); }}>فتح الدفعة</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : <div className="empty-state">لا توجد دفعات متأخرة حالياً</div>}
      </div>
    </div>
    );
  };

  const renderDocuments = () => (
    <div className="page-block">
      <div className="section-header">
        <h2>المرفقات والمستندات</h2>
        <button className="primary-btn small">رفع ملف</button>
      </div>

      <div className="panel full-width-panel">
        <table>
          <thead>
            <tr>
              <th>اسم الملف</th>
              <th>النوع</th>
              <th>تاريخ الرفع</th>
              <th>المسؤول</th>
              <th>الإجراء</th>
            </tr>
          </thead>
          <tbody>
            {data.documents.map((doc) => (
              <tr key={doc.name}>
                <td>{doc.name}</td>
                <td>{doc.type}</td>
                <td>{doc.date}</td>
                <td>{doc.owner}</td>
                <td><button className="table-btn">تحميل</button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );

  const renderSettings = () => (
    <div className="page-block">
      <div className="section-header">
        <h2>الإعدادات</h2>
      </div>

      <div className="settings-grid">
        <div className="panel">
          <h3>بيانات الشركة</h3>
          <div className="form-grid">
            <label><span>اسم الشركة</span><input type="text" value={settingsForm.companyName} onChange={(e) => setSettingsForm({ ...settingsForm, companyName: e.target.value })} /></label>
            <label><span>البريد الإلكتروني</span><input type="email" value={settingsForm.email} onChange={(e) => setSettingsForm({ ...settingsForm, email: e.target.value })} /></label>
            <label><span>رقم الهاتف</span><input type="text" value={settingsForm.phone} onChange={(e) => setSettingsForm({ ...settingsForm, phone: e.target.value })} /></label>
            <label><span>العملة</span><input type="text" value={settingsForm.currency} onChange={(e) => setSettingsForm({ ...settingsForm, currency: e.target.value })} /></label>
          </div>
          <div className="form-actions mt-20">
            <button className="primary-btn small" onClick={saveSettings}>حفظ إعدادات الشركة</button>
          </div>
          {settingsMessage && <div className="form-message success-message">{settingsMessage}</div>}
        </div>

        <div className="panel">
          <h3>إعدادات التنبيهات</h3>
          <div className="form-grid">
            <label><span>إشعار قبل الانتهاء</span><input type="number" value={settingsForm.alertBeforeEnd} onChange={(e) => setSettingsForm({ ...settingsForm, alertBeforeEnd: e.target.value })} /></label>
            <label><span>إشعار قبل الدفع</span><input type="number" value={settingsForm.alertBeforeDue} onChange={(e) => setSettingsForm({ ...settingsForm, alertBeforeDue: e.target.value })} /></label>
            <label><span>لغة النظام</span><input type="text" value={settingsForm.language} onChange={(e) => setSettingsForm({ ...settingsForm, language: e.target.value })} /></label>
            <label><span>مستوى الوصول</span><input type="text" value="مدير" readOnly /></label>
          </div>
        </div>
      </div>
    </div>
  );

  const renderContent = () => {
    switch (activePage) {
      case 'contracts': return renderContracts();
      case 'contract-detail': return renderContractDetail();
      case 'payment-detail': return renderPaymentDetail();
      case 'tenants': return renderTenants();
      case 'payments': return renderPayments();
      case 'alerts': return renderAlerts();
      case 'reports': return renderReports();
      case 'documents': return renderDocuments();
      case 'settings': return renderSettings();
      default: return renderDashboard();
    }
  };

  if (!isLoggedIn) {
    return (
      <div className="login-shell">
        <div className="login-card">
          <div className="login-brand">
            <div className="brand-icon">E</div>
            <div>
              <h2>إيجارات</h2>
              <p>نظام إدارة العقود</p>
            </div>
          </div>

          <form onSubmit={handleLogin} className="login-form">
            <h3>تسجيل الدخول</h3>
            <label>
              <span>اسم المستخدم</span>
              <input
                type="text"
                value={loginForm.username}
                onChange={(e) => setLoginForm({ ...loginForm, username: e.target.value })}
              />
            </label>
            <label>
              <span>كلمة المرور</span>
              <input
                type="password"
                value={loginForm.password}
                onChange={(e) => setLoginForm({ ...loginForm, password: e.target.value })}
              />
            </label>

            {loginMessage && <div className="login-error">{loginMessage}</div>}

            <button type="submit" className="primary-btn full">دخول النظام</button>
          </form>
        </div>
      </div>
    );
  }

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
          {navItems.map((item) => (
            <button
              key={item.key}
              className={`nav-item ${activePage === item.key ? 'active' : ''}`}
              onClick={() => setActivePage(item.key)}
            >
              {item.label}
            </button>
          ))}
        </nav>

        <button className="logout-btn" onClick={() => setIsLoggedIn(false)}>تسجيل الخروج</button>
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

        {renderContent()}
      </main>
    </div>
  );
}

export default App;
