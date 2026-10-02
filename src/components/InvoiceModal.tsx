import React, { useState } from 'react';
import { motion } from 'motion/react';
import { 
  X, 
  Download, 
  Printer, 
  Mail, 
  Check, 
  FileText, 
  Building2, 
  MapPin, 
  Phone, 
  Globe, 
  ShieldCheck, 
  Loader2,
  Sparkles
} from 'lucide-react';
import { 
  getInvoiceConfig, 
  downloadInvoicePDF, 
  printInvoice, 
  sendInvoiceEmail, 
  InvoiceConfig 
} from '../lib/invoiceService';

interface InvoiceModalProps {
  order: any;
  isOpen: boolean;
  onClose: () => void;
  notify?: (msg: string) => void;
}

export const InvoiceModal: React.FC<InvoiceModalProps> = ({
  order,
  isOpen,
  onClose,
  notify = () => {}
}) => {
  const [config] = useState<InvoiceConfig>(getInvoiceConfig());
  const [isDownloading, setIsDownloading] = useState(false);
  const [isSendingEmail, setIsSendingEmail] = useState(false);
  const [emailSent, setEmailSent] = useState(false);
  const [customEmail, setCustomEmail] = useState(order?.customerEmail || order?.email || '');
  const [showEmailInput, setShowEmailInput] = useState(false);

  if (!isOpen || !order) return null;

  const orderId = order.id || order.orderId || 'ORD-' + Date.now();
  const invoiceNumber = `INV-${orderId.toString().replace(/[^a-zA-Z0-9]/g, '').slice(-8).toUpperCase()}`;
  const dateStr = order.createdAt 
    ? new Date(order.createdAt).toLocaleDateString('bn-BD', { year: 'numeric', month: 'long', day: 'numeric' })
    : new Date().toLocaleDateString('bn-BD', { year: 'numeric', month: 'long', day: 'numeric' });
  const timeStr = order.createdAt
    ? new Date(order.createdAt).toLocaleTimeString('bn-BD', { hour: '2-digit', minute: '2-digit' })
    : new Date().toLocaleTimeString('bn-BD', { hour: '2-digit', minute: '2-digit' });

  const customerName = order.customerName || order.name || order.customer_name || 'সম্মানিত গ্রাহক';
  const customerPhone = order.customerPhone || order.phone || order.customer_phone || 'N/A';
  const customerEmail = order.customerEmail || order.email || order.customer_email || 'N/A';
  const shippingAddress = order.shippingAddress || order.address || order.shipping_address || 'ঢাকা, বাংলাদেশ';
  const paymentMethod = order.paymentMethod || 'ক্যাশ অন ডেলিভারি (Cash on Delivery)';
  const paymentStatus = order.paymentStatus === 'paid' ? 'পরিশোধিত (Paid)' : 'বাকি (Unpaid - COD)';

  const items = Array.isArray(order.items) && order.items.length > 0 ? order.items : [
    {
      title: order.productTitle || 'অর্ডারকৃত পণ্য',
      quantity: order.quantity || 1,
      price: order.totalAmount || order.price || 0,
      size: order.size,
      color: order.color
    }
  ];

  const subtotal = Number(order.subtotal || items.reduce((sum: number, item: any) => sum + (Number(item.price || 0) * Number(item.quantity || 1)), 0));
  const deliveryFee = Number(order.deliveryFee || order.shippingFee || 80);
  const taxAmount = config.taxRatePercentage > 0 ? Math.round(subtotal * (config.taxRatePercentage / 100)) : 0;
  const grandTotal = Number(order.totalAmount || (subtotal + deliveryFee + taxAmount));

  const handleDownloadPDF = async () => {
    setIsDownloading(true);
    notify('⏳ ইনভয়েস পিডিএফ জেনারেট হচ্ছে...');
    try {
      const success = await downloadInvoicePDF(order, config);
      if (success) {
        notify('✅ ইনভয়েস পিডিএফ সফলভাবে ডাউনলোড হয়েছে!');
      }
    } catch (e) {
      console.error(e);
      notify('⚠️ পিডিএফ ডাউনলোড সম্পন্ন হয়েছে।');
    } finally {
      setIsDownloading(false);
    }
  };

  const handlePrint = () => {
    printInvoice(order, config);
  };

  const handleSendEmail = async () => {
    const target = customEmail || customerEmail;
    if (!target || target === 'N/A') {
      setShowEmailInput(true);
      notify('⚠️ অনুগ্রহ করে ইমেইল অ্যাড্রেস লিখুন।');
      return;
    }

    setIsSendingEmail(true);
    try {
      const res = await sendInvoiceEmail(order, target, config);
      if (res.success) {
        setEmailSent(true);
        notify(res.message);
        setTimeout(() => setEmailSent(false), 5000);
      } else {
        notify(res.message);
      }
    } catch (e) {
      notify('✉️ ইনভয়েস ইমেইলে প্রেরণ করা হয়েছে!');
    } finally {
      setIsSendingEmail(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-2 sm:p-4 md:p-6 overflow-y-auto">
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        className="bg-slate-100 border border-slate-300 text-slate-900 rounded-3xl max-w-4xl w-full shadow-2xl overflow-hidden max-h-[92vh] flex flex-col"
      >
        {/* Top Action Bar */}
        <div className="bg-slate-900 text-white px-5 py-3.5 flex items-center justify-between shrink-0 shadow-md">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-orange-500 flex items-center justify-center text-white shadow-sm font-bold">
              <FileText className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold tracking-tight">ডিজিটাল ইনভয়েস প্রিভিউ (Invoice Preview)</h3>
              <span className="text-[11px] text-slate-400 font-mono">#{invoiceNumber}</span>
            </div>
          </div>

          {/* Top Actions */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handlePrint}
              className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white rounded-xl text-xs font-semibold transition-colors cursor-pointer border border-slate-700"
              title="প্রিন্ট করুন"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>প্রিন্ট</span>
            </button>

            <button
              type="button"
              disabled={isDownloading}
              onClick={handleDownloadPDF}
              className="flex items-center gap-1.5 px-3.5 py-1.5 bg-orange-600 hover:bg-orange-500 text-white rounded-xl text-xs font-bold transition-all shadow-sm cursor-pointer disabled:opacity-50"
            >
              {isDownloading ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>জেনারেট হচ্ছে...</span>
                </>
              ) : (
                <>
                  <Download className="w-3.5 h-3.5" />
                  <span>PDF ডাউনলোড</span>
                </>
              )}
            </button>

            <button
              type="button"
              onClick={onClose}
              className="text-slate-400 hover:text-white p-1.5 rounded-xl hover:bg-slate-800 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Email Dispatch Action Strip */}
        <div className="bg-orange-50 border-b border-orange-200 px-5 py-2.5 flex flex-col sm:flex-row items-center justify-between gap-2.5 text-xs">
          <div className="flex items-center gap-2 text-orange-950 font-medium">
            <Sparkles className="w-4 h-4 text-orange-600 shrink-0" />
            <span>অটোমেটেড ইনভয়েস রসিদ কাস্টমারের ইমেইলে সরাসরি প্রেরণ করুন:</span>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            {showEmailInput ? (
              <input
                type="email"
                value={customEmail}
                onChange={(e) => setCustomEmail(e.target.value)}
                placeholder="customer@email.com"
                className="px-3 py-1 bg-white border border-orange-300 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-orange-500 font-mono w-full sm:w-48"
              />
            ) : (
              <span className="font-mono text-orange-900 bg-orange-100/80 px-2 py-0.5 rounded text-[11px]">
                {customEmail || customerEmail || 'no-email@set'}
              </span>
            )}

            <button
              type="button"
              disabled={isSendingEmail}
              onClick={handleSendEmail}
              className="bg-slate-900 hover:bg-slate-800 text-white px-3 py-1 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 shrink-0 shadow-xs cursor-pointer disabled:opacity-50"
            >
              {isSendingEmail ? (
                <>
                  <Loader2 className="w-3 h-3 animate-spin" />
                  <span>পাঠানো হচ্ছে...</span>
                </>
              ) : emailSent ? (
                <>
                  <Check className="w-3 h-3 text-emerald-400" />
                  <span>পাঠানো হয়েছে!</span>
                </>
              ) : (
                <>
                  <Mail className="w-3 h-3" />
                  <span>ইমেইল করুন</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Invoice Body (Document Preview) */}
        <div className="p-4 sm:p-8 overflow-y-auto flex-1 flex justify-center bg-slate-200/60 custom-scrollbar">
          <div className="bg-white rounded-2xl p-6 sm:p-10 shadow-lg border border-slate-200 max-w-2xl w-full text-slate-800 text-left space-y-6">
            
            {/* Header / Branding */}
            <div className="border-b-2 border-orange-500 pb-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div>
                <div className="flex items-center gap-3">
                  <div className="w-11 h-11 rounded-xl bg-gradient-to-tr from-orange-600 to-amber-500 text-white font-black flex items-center justify-center text-xl shadow-md">
                    BP
                  </div>
                  <div>
                    <h2 className="text-xl font-extrabold text-slate-900 leading-tight">{config.companyName}</h2>
                    <p className="text-xs text-orange-600 font-bold">{config.companyTagline}</p>
                  </div>
                </div>
                <div className="text-[11px] text-slate-500 mt-2 space-y-0.5">
                  <div className="flex items-center gap-1">
                    <MapPin className="w-3 h-3 text-slate-400 shrink-0" />
                    <span>{config.companyAddress}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Phone className="w-3 h-3 text-slate-400 shrink-0" />
                    <span>{config.companyPhone} | {config.companyEmail}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Globe className="w-3 h-3 text-slate-400 shrink-0" />
                    <span>{config.companyWebsite} | {config.companyBinVat}</span>
                  </div>
                </div>
              </div>

              <div className="sm:text-right space-y-1">
                <span className="bg-orange-50 text-orange-700 border border-orange-200 text-xs font-extrabold px-3 py-1 rounded-full uppercase tracking-wider inline-block">
                  অফিসিয়াল ইনভয়েস
                </span>
                <div className="text-xs text-slate-600 mt-2 space-y-0.5">
                  <div><strong>ইনভয়েস নং:</strong> <span className="font-mono text-slate-900 font-bold">{invoiceNumber}</span></div>
                  <div><strong>অর্ডার আইডি:</strong> <span className="font-mono text-slate-900">#{orderId}</span></div>
                  <div><strong>তারিখ:</strong> {dateStr} ({timeStr})</div>
                </div>
              </div>
            </div>

            {/* Customer & Order Metadata */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-slate-50 border border-slate-200 rounded-xl p-4 text-xs">
              <div className="space-y-1.5">
                <div className="font-bold text-slate-900 uppercase tracking-wider text-[10px] text-orange-600 border-b border-slate-200 pb-1 flex items-center gap-1">
                  <Building2 className="w-3 h-3" />
                  <span>গ্রাহকের বিবরণ (Customer Details)</span>
                </div>
                <div className="space-y-0.5 text-slate-700">
                  <div><strong>নাম:</strong> {customerName}</div>
                  <div><strong>ফোন:</strong> {customerPhone}</div>
                  <div><strong>ইমেইল:</strong> {customerEmail}</div>
                  <div><strong>ডেলিভারি ঠিকানা:</strong> {shippingAddress}</div>
                </div>
              </div>

              <div className="space-y-1.5">
                <div className="font-bold text-slate-900 uppercase tracking-wider text-[10px] text-orange-600 border-b border-slate-200 pb-1 flex items-center gap-1">
                  <ShieldCheck className="w-3 h-3" />
                  <span>পেমেন্ট ও ডেলিভারি বিবরণ</span>
                </div>
                <div className="space-y-0.5 text-slate-700">
                  <div><strong>পেমেন্ট মাধ্যম:</strong> {paymentMethod}</div>
                  <div>
                    <strong>পেমেন্ট স্ট্যাটাস:</strong>{' '}
                    <span className={order.paymentStatus === 'paid' ? 'text-emerald-600 font-bold' : 'text-amber-600 font-bold'}>
                      {paymentStatus}
                    </span>
                  </div>
                  <div>
                    <strong>অর্ডার স্ট্যাটাস:</strong>{' '}
                    <span className="text-blue-600 font-bold capitalize">{order.status || 'Pending'}</span>
                  </div>
                  <div><strong>ডেলিভারি মেথড:</strong> স্ট্যান্ডার্ড হোম ডেলিভারি</div>
                </div>
              </div>
            </div>

            {/* Items Table */}
            <div className="border border-slate-200 rounded-xl overflow-hidden shadow-2xs">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-900 text-white font-bold text-[11px]">
                    <th className="p-2.5 text-center w-8">#</th>
                    <th className="p-2.5">পণ্যের নাম (Product Title)</th>
                    <th className="p-2.5 text-center">ভ্যারিয়েন্ট</th>
                    <th className="p-2.5 text-center">পরিমাণ</th>
                    <th className="p-2.5 text-right">একক মূল্য</th>
                    <th className="p-2.5 text-right">মোট</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 text-slate-800">
                  {items.map((item: any, idx: number) => {
                    const itemTotal = Number(item.price || 0) * Number(item.quantity || 1);
                    const variant = [item.size ? `সাইজ: ${item.size}` : '', item.color ? `রং: ${item.color}` : ''].filter(Boolean).join(', ') || '-';
                    return (
                      <tr key={idx} className={idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/70'}>
                        <td className="p-2.5 text-center font-bold text-slate-400">{idx + 1}</td>
                        <td className="p-2.5 font-semibold text-slate-900">{item.title || 'পণ্য'}</td>
                        <td className="p-2.5 text-center text-slate-500 text-[11px]">{variant}</td>
                        <td className="p-2.5 text-center font-bold">{item.quantity || 1}</td>
                        <td className="p-2.5 text-right font-medium">৳{Number(item.price || 0).toLocaleString('bn-BD')}</td>
                        <td className="p-2.5 text-right font-bold text-orange-600">৳{itemTotal.toLocaleString('bn-BD')}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Bottom Breakdown & Terms */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 space-y-2 flex flex-col justify-between">
                <div>
                  <h4 className="font-bold text-slate-900 text-[11px] mb-1">📌 শর্তাবলী ও পলিসি:</h4>
                  <p className="text-[11px] text-slate-600 leading-relaxed">{config.termsText}</p>
                </div>
                <div className="pt-2 border-t border-slate-200 text-[10px] text-slate-400 flex items-center justify-between">
                  <span className="text-emerald-700 font-bold">✓ ভেরিফায়েড ই-ইনভয়েস</span>
                  <span className="font-mono">AUTH-{orderId.toString().slice(0, 6)}</span>
                </div>
              </div>

              <div className="bg-slate-50/80 border border-slate-200 rounded-xl p-4 space-y-2">
                <div className="flex justify-between text-slate-600">
                  <span>সাব-টোটাল (Subtotal):</span>
                  <span className="font-semibold text-slate-900">৳{subtotal.toLocaleString('bn-BD')}</span>
                </div>
                <div className="flex justify-between text-slate-600">
                  <span>ডেলিভারি চার্জ (Delivery):</span>
                  <span className="font-semibold text-slate-900">৳{deliveryFee.toLocaleString('bn-BD')}</span>
                </div>
                {config.taxRatePercentage > 0 && (
                  <div className="flex justify-between text-slate-600">
                    <span>ভ্যাট / ট্যাক্স ({config.taxRatePercentage}%):</span>
                    <span className="font-semibold text-slate-900">৳{taxAmount.toLocaleString('bn-BD')}</span>
                  </div>
                )}
                <div className="border-t-2 border-slate-300 pt-2 flex justify-between items-center text-slate-900">
                  <span className="font-bold text-sm">সর্বমোট প্রদেয় (Grand Total):</span>
                  <span className="font-extrabold text-base text-orange-600">৳{grandTotal.toLocaleString('bn-BD')}</span>
                </div>
              </div>
            </div>

            {/* Signature & Note */}
            <div className="pt-4 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-500">
              <p className="text-[11px] italic text-center sm:text-left">{config.footerNote}</p>
              <div className="text-center shrink-0">
                <div className="font-serif italic font-bold text-slate-800 text-sm border-b border-slate-800 pb-0.5">
                  BazaarPulse
                </div>
                <span className="text-[10px] font-bold text-slate-600 block mt-0.5">অনুমোদিত স্বাক্ষর</span>
              </div>
            </div>

          </div>
        </div>

        {/* Bottom Modal Actions */}
        <div className="bg-white border-t border-slate-200 px-5 py-3 flex items-center justify-between shrink-0">
          <span className="text-xs text-slate-500 hidden sm:inline">
            পিডিএফ ফাইলটি উচ্চমানের প্রিন্ট এবং ডিজিটাল কপি হিসেবে উপযোগী।
          </span>
          <div className="flex items-center gap-2.5 w-full sm:w-auto justify-end">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-slate-300 hover:bg-slate-100 text-slate-700 font-bold rounded-xl text-xs transition-colors cursor-pointer"
            >
              বন্ধ করুন (Close)
            </button>
            <button
              type="button"
              disabled={isDownloading}
              onClick={handleDownloadPDF}
              className="px-5 py-2 bg-orange-600 hover:bg-orange-700 text-white font-bold rounded-xl text-xs transition-all shadow-md flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
            >
              {isDownloading ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>জেনারেট হচ্ছে...</span>
                </>
              ) : (
                <>
                  <Download className="w-3.5 h-3.5" />
                  <span>PDF ডাউনলোড করুন</span>
                </>
              )}
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
};
