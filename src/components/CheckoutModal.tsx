import React, { useState } from 'react';
import { motion } from 'motion/react';
import { X, ShieldCheck } from 'lucide-react';

interface CartItem {
  product: any;
  quantity: number;
  size?: string;
  color?: string;
  selected?: boolean;
}

interface CheckoutModalProps {
  isOpen: boolean;
  onClose: () => void;
  cart: CartItem[];
  authUser: any;
  onSubmitOrder: (orderPayload: any) => Promise<void>;
  notify: (msg: string) => void;
}

// Complete Bangladesh 64 Districts and Thanas/Upazilas Dictionary
const BD_DISTRICTS_DATA: Record<string, string[]> = {
  "Dhaka": ["আগারগাঁও", "মিরপুর", "ধানমন্ডি", "গুলশান", "উত্তরা", "মোহাম্মদপুর", "বাড্ডা", "তেজগাঁও", "সাভার", "ধামরাই", "কেরানীগঞ্জ", "নবাবগঞ্জ", "দোহার"],
  "Chattogram": ["পতেঙ্গা", "কোতোয়ালী", "হালিশহর", "পাঁচলাইশ", "খুলশী", "ডাবলমুরিং", "পাহাড়তলী", "হাটহাজারী", "সীতাকুণ্ড", "পটিয়া", "রাউজান", "সন্দীপ"],
  "Gazipur": ["গাজীপুর সদর", "টঙ্গী", "কালিয়াকৈর", "শ্রীপুর", "কাপাসিয়া", "কালীগঞ্জ"],
  "Narayanganj": ["নারায়ণগঞ্জ সদর", "সিদ্ধিরগঞ্জ", "বন্দর", "রূপগঞ্জ", "আড়াইহাজার", "সোনারগাঁ"],
  "Cumilla": ["কুমিল্লা সদর", "চৌদ্দগ্রাম", "লাকসাম", "দাউদকান্দি", "দেবীদ্বার", "বুড়িচং", "বরুড়া", "মুরাদনগর"],
  "Sylhet": ["সিলেট সদর", "দক্ষিণ সুরমা", "গোলাপগঞ্জ", "বিয়াইনীবাজার", "জৈন্তাপুর", "কানাইঘাট", "বিশ্বনাথ"],
  "Rajshahi": ["বোয়ালিয়া", "রাজপাড়া", "মতিহার", "শাহ মখদুম", "পবা", "বাঘমারা", "পুটখিয়া", "গোদাগাড়ী"],
  "Khulna": ["খুলনা সদর", "সোনাডাঙ্গা", "খালিশপুর", "দৌলতপুর", "রূপসা", "ফুলতলা", "বটিয়াঘাটা", "ডুমুরিয়া"],
  "Barishal": ["বরিশাল সদর", "বাকেরগঞ্জ", "বাবুগঞ্জ", "গৌরনদী", "উজিরপুর", "মেহেন্দিগঞ্জ", "মুলাদী"],
  "Rangpur": ["রংপুর সদর", "মিঠাপুকুর", "পীরগঞ্জ", "কাউনিয়া", "গঙ্গাচড়া", "বদরগঞ্জ", "পীরগাছা"],
  "Mymensingh": ["ময়মনসিংহ সদর", "মুক্তাগাছা", "ত্রিশাল", "ভালুকা", "গফরগাঁও", "ফুলবাড়ীয়া", "নন্দাইল"],
  "Bogura": ["বগুড়া সদর", "শেরপুর", "শিবগঞ্জ", "শাজাহানপুর", "গাবতলী", "ধুনট", "সরিষাবাড়ী"],
  "Cox's Bazar": ["কক্সবাজার সদর", "উখিয়া", "টেকনাফ", "চকোরিয়া", "মহেশখালী", "রামু", "পেকুয়া"],
  "Feni": ["ফেনী সদর", "দাগনভূঞা", "ছাগলনাইয়া", "পরশুরাম", "ফুলগাজী", "সোনাগাজী"],
  "Noakhali": ["নোয়াখালী সদর", "বেগমগঞ্জ", "চাটখিল", "কোম্পানীগঞ্জ", "সেনবাগ", "হাতিয়া", "সুবর্ণচর"],
  "Brahmanbaria": ["ব্রাহ্মণবাড়িয়া সদর", "আশুগঞ্জ", "কসবা", "নবীনগর", "সরাইল", "বাঞ্ছারামপুর"],
  "Jessore": ["যশোর সদর", "ঝিকরগাছা", "মনিরামপুর", "অভয়নগর", "বাগাড়পাড়া", "শার্শা"],
  "Pabna": ["পাবনা সদর", "ঈশ্বরদী", "বেড়া", "সাঁথিয়া", "চাটমোহর", "সুজানগর"],
  "Tangail": ["টাঙ্গাইল সদর", "মির্জাপুর", "কালিহাতী", "ঘাটাইল", "সখিপুর", "মধুপুর", "বাসাইল"],
  "Faridpur": ["ফরিদপুর সদর", "ভাঙ্গা", "বোয়ালমারী", "নগরকান্দা", "মধুখালী", "আলফাডাঙ্গা"],
  "Kushtia": ["কুষ্টিয়া সদর", "কুমারখালী", "ভেড়ামারা", "মিরপুর", "খোকসা", "দৌলতপুর"],
  "Dinajpur": ["দিনাজপুর সদর", "ফুলবাড়ী", "বীরগঞ্জ", "পার্বতীপুর", "বিরামপুর", "হাকিমপুর"],
  "Jamalpur": ["জামালপুর সদর", "সরষাবাড়ী", "মেলান্দহ", "ইসলামপুর", "বক্সীগঞ্জ"],
  "Patuakhali": ["পটুয়াখালী সদর", "গলাচিপা", "কলাপাড়া", "দশমিনা", "মির্জাগঞ্জ"],
  "Narsingdi": ["নরসিংদী সদর", "পলাশ", "শিবপুর", "রায়পুরা", "মনোহরদী", "বেলবো"],
  "Munshiganj": ["মুন্সীগঞ্জ সদর", "শ্রীনগর", "সিরাজদিখান", "গজাড়িয়া", "টঙ্গীবাড়ী", "লোহাজং"],
  "Manikganj": ["মানিকগঞ্জ সদর", "সিঙ্গাইর", "সাটুরিয়া", "ঘিওর", "শিবালয়"],
  "Kishoreganj": ["কিশোরগঞ্জ সদর", "ভৈরব", "কটিয়াদী", "বাজিতপুর", "হোসেনপুর"],
  "Natore": ["নাটোর সদর", "সিংড়া", "বড়াইগ্রাম", "গুরুদাসপুর", "লালপুর"],
  "Naogaon": ["নওগাঁ সদর", "মহাদেবপুর", "পোরশা", "ধামইরহাট", "বদলগাছী"],
  "Sirajganj": ["সিরাজগঞ্জ সদর", "শাহজাদপুর", "উল্লাপাড়া", "বেলকুচি", "কাজিপুর"],
  "Satkhira": ["সাতক্ষীরা সদর", "কলারোয়া", "কালীগঞ্জ", "শ্যামনগর", "আশাশুনি"],
  "Bagerhat": ["বাগেরহাট সদর", "মোংলা", "ফকিরহাট", "চিতলমারী", "কচুয়া"],
  "Jhenaidah": ["ঝিনাইদহ সদর", "কালীগঞ্জ", "শৈলকুপা", "মহেশপুর", "কোটচাঁদপুর"],
  "Chuadanga": ["চুয়াডাঙ্গা সদর", "আলমডাঙ্গা", "দামুড়হুদা", "জীবননগর"],
  "Meherpur": ["মেহেরপুর সদর", "গাংনী", "মুজিবনগর"],
  "Magura": ["মাগুরা সদর", "শ্রীপুর", "মহম্মদপুর", "শালিখা"],
  "Narail": ["নড়াইল সদর", "লোহাগাড়া", "কালিয়া"],
  "Chandpur": ["চাঁদপুর সদর", "হাজীগঞ্জ", "মতলব উত্তর", "মতলব দক্ষিণ", "শাহরাস্তি", "ফরিদগঞ্জ"],
  "Lakshmipur": ["লক্ষ্মীপুর সদর", "রায়পুর", "রামগঞ্জ", "রামগতি", "কমলনগর"],
  "Khagrachhari": ["খাগড়াছড়ি সদর", "দীঘিনালা", "পানছড়ি", "মাটিরাঙ্গা", "রামগড়"],
  "Rangamati": ["রাঙ্গামাটি সদর", "কাপ্তাই", "কাউখালী", "বাঘাইছড়ি", "রাজস্থলী"],
  "Bandarban": ["বান্দরবান সদর", "রুমা", "থানচি", "লামা", "আলিকদম"],
  "Habiganj": ["হবিগঞ্জ সদর", "নবীগঞ্জ", "মাধবপুর", "চুনারুঘাট", "বাহুবল"],
  "Moulvibazar": ["মৌলভীবাজার সদর", "শ্রীমঙ্গল", "কুলাউড়া", "বড়লেখা", "কমলগঞ্জ"],
  "Sunamganj": ["সুনামগঞ্জ সদর", "ছাতক", "জগন্নাথপুর", "দিরাই", "ধর্মপাশা"],
  "Sherpur": ["শেরপুর সদর", "নালিতাবাড়ী", "শ্রীবরদী", "ঝিনাইগাতী"],
  "Netrokona": ["নেত্রকোণা সদর", "পূর্বধলা", "দুর্গাপুর", "মোহনগঞ্জ", "কলমাকান্দা"],
  "Kurigram": ["কুড়িগ্রাম সদর", "উলিপুর", "নাগেশ্বরী", "ভুরুঙ্গামারী", "ফুলবাড়ী"],
  "Gaibandha": ["গাইবান্ধা সদর", "গোবিন্দগঞ্জ", "পলাশবাড়ী", "সুন্দরগঞ্জ", "সাদুল্লাপুর"],
  "Lalmonirhat": ["লালমনিরহাট সদর", "পাটগ্রাম", "হাতীবান্ধা", "কালীগঞ্জ"],
  "Nilphamari": ["নীলফামারী সদর", "সৈয়দপুর", "ডিমলা", "জলঢাকা", "কিশোরগঞ্জ"],
  "Panchagarh": ["পঞ্চগড় সদর", "তেঁতুলিয়া", "বোদা", "দেবীগঞ্জ", "আটোয়ারী"],
  "Thakurgaon": ["ঠাকুরগাঁও সদর", "পীরগঞ্জ", "বালিয়াডাঙী", "রানীশংকৈল"],
  "Joypurhat": ["জয়পুরহাট সদর", "পাঁচবিবি", "ক্ষেতলাল", "আক্কেলপুর"],
  "Chapainawabganj": ["চাঁপাইনবাবগঞ্জ সদর", "শিবগঞ্জ", "গোমস্তাপুর", "ভোলাহাট"],
  "Barguna": ["বরগুনা সদর", "আমতলী", "পাথরঘাটা", "বেতাগী"],
  "Bhola": ["ভোলা সদর", "চরফ্যাশন", "বোরহানউদ্দিন", "লালমোহন"],
  "Jhalokati": ["ঝালকাঠি সদর", "নলছিটি", "রাজাপুর", "কাঠালিয়া"],
  "Pirojpur": ["পিরোজপুর সদর", "ভাণ্ডারিয়া", "মঠবাড়িয়া", "নেছারাবাদ"],
  "Shariatpur": ["শরীয়তপুর সদর", "নড়িয়া", "জাজিরা", "গোসাইরহাট"],
  "Madaripur": ["মাদারীপুর সদর", "রাজৈর", "কালকিনি", "শিবচর"],
  "Gopalganj": ["গোপালগঞ্জ সদর", "মুকসুদপুর", "কোটালীপাড়া", "টুঙ্গিপাড়া"],
  "Rajbari": ["রাজবাড়ী সদর", "পাংশা", "গোয়ালন্দ", "বালিয়াকান্দি"]
};

export default function CheckoutModal({
  isOpen,
  onClose,
  cart,
  authUser,
  onSubmitOrder,
  notify
}: CheckoutModalProps) {
  const [shippingInfo, setShippingInfo] = useState({
    name: authUser?.name || 'Arafat Munna',
    phone: authUser?.phone || '8801756482001',
    altPhone: '',
    country: 'বাংলাদেশ',
    district: 'Dhaka',
    thana: 'আগারগাঁও',
    fullAddressDetails: '',
    addressType: 'Home' as 'Home' | 'Office',
    paymentMethod: 'card',
    savePaymentMethod: true
  });

  const [promoCode, setPromoCode] = useState('');
  const [appliedPromo, setAppliedPromo] = useState<{ code: string; discount: number } | null>(null);
  const [submitting, setSubmitting] = useState(false);

  if (!isOpen) return null;

  // Selected cart items or all cart items if non-selected
  const activeItems = cart.filter(i => i.selected !== false);
  const itemsToCheckout = activeItems.length > 0 ? activeItems : cart;

  // Financial calculations
  const rawSubtotal = itemsToCheckout.reduce((sum, item) => sum + (item.product.price * item.quantity), 0);
  const discountedSubtotal = itemsToCheckout.reduce((sum, item) => sum + ((item.product.discountPrice || item.product.price) * item.quantity), 0);

  // Delivery Charge calculation based on selected district
  const isInsideDhaka = shippingInfo.district === 'Dhaka' || shippingInfo.district === 'ঢাকা';
  const deliveryCharge = isInsideDhaka ? 80 : 150;

  // Final Total
  const subtotalForCalc = discountedSubtotal;
  const promoDiscountAmount = appliedPromo ? appliedPromo.discount : 0;
  const payableTotal = Math.max(0, subtotalForCalc + deliveryCharge - promoDiscountAmount);

  const handleDistrictChange = (selectedDistrict: string) => {
    const thanas = BD_DISTRICTS_DATA[selectedDistrict] || ["সদর"];
    setShippingInfo({
      ...shippingInfo,
      district: selectedDistrict,
      thana: thanas[0] || 'সদর'
    });
  };

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();

    if (!shippingInfo.name.trim() || !shippingInfo.phone.trim()) {
      notify('⚠️ অনুগ্রহ করে আপনার নাম ও মোবাইল নম্বর প্রদান করুন');
      return;
    }

    if (!shippingInfo.fullAddressDetails.trim()) {
      notify('⚠️ অনুগ্রহ করে বাসা/ফ্ল্যাট নম্বর ও পাড়া-মহল্লার নাম উল্লেখ করুন');
      return;
    }

    setSubmitting(true);
    try {
      const fullAddressString = `${shippingInfo.fullAddressDetails}, থানা: ${shippingInfo.thana}, জেলা: ${shippingInfo.district}, ${shippingInfo.country} (টাইপ: ${shippingInfo.addressType})`;

      const orderPayload = {
        items: itemsToCheckout.map(i => {
          const firstImg = Array.isArray(i.product.images) && i.product.images.length > 0
            ? i.product.images[0]
            : (i.product.image || i.product.images || 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=200');
          return {
            productId: i.product.id,
            title: i.product.title,
            price: i.product.discountPrice || i.product.price,
            quantity: i.quantity,
            vendorId: i.product.vendorId,
            size: i.size,
            color: i.color,
            image: firstImg,
            productUrl: `${window.location.origin}/product/${i.product.id}`
          };
        }),
        customerName: shippingInfo.name,
        customerEmail: authUser?.email || `${shippingInfo.phone}@customer.com`,
        phone: shippingInfo.phone,
        altPhone: shippingInfo.altPhone,
        address: fullAddressString,
        district: shippingInfo.district,
        thana: shippingInfo.thana,
        addressType: shippingInfo.addressType,
        paymentMethod: shippingInfo.paymentMethod,
        paymentStatus: shippingInfo.paymentMethod === 'cod' ? 'unpaid' : 'paid',
        subtotal: subtotalForCalc,
        deliveryFee: deliveryCharge,
        discountAmount: promoDiscountAmount,
        totalAmount: payableTotal
      };

      await onSubmitOrder(orderPayload);
    } catch (err: any) {
      notify('❌ অর্ডার সম্পন্ন করা সম্ভব হয়নি: ' + (err.message || ''));
    } finally {
      setSubmitting(false);
    }
  };

  const districtThanas = BD_DISTRICTS_DATA[shippingInfo.district] || ["সদর"];

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-2 sm:p-4 md:p-6 overflow-y-auto">
      <motion.div
        initial={{ scale: 0.96, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.96, opacity: 0 }}
        className="bg-slate-50 border border-slate-200 text-black rounded-2xl max-w-6xl w-full shadow-2xl overflow-hidden max-h-[95vh] flex flex-col"
      >
        {/* Top Header */}
        <div className="bg-white border-b border-slate-200 px-5 py-3.5 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-emerald-600" />
            <h2 className="text-base font-bold text-black tracking-tight">
              BazaarPulse Secure Checkout (পেমেন্ট ও অর্ডার নিশ্চিতকরণ)
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-500 hover:text-black p-1.5 rounded-xl hover:bg-slate-100 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Main Grid: Left Column Payment Options, Right Column Summary */}
        <div className="p-4 sm:p-6 overflow-y-auto grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* LEFT COLUMN: Payment Methods & Add Address Form */}
          <div className="lg:col-span-2 space-y-6">
            
            {/* Payment Method Header Box */}
            <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs text-left">
              <div className="border-b border-slate-100 pb-3 mb-4">
                <h3 className="text-lg font-bold text-black">Payment Method</h3>
                <p className="text-xs font-medium text-black">(Please select a payment method)</p>
              </div>

              {/* CATEGORY 1: ক্যাশ অন ডেলিভারি (Cash on Delivery) */}
              <div className="mb-6 space-y-2">
                <div className="text-left">
                  <h4 className="font-bold text-sm text-black">ক্যাশ অন ডেলিভারি</h4>
                  <p className="text-xs font-medium text-black">পণ্য হাতে পেয়ে টাকা পরিশোধ করুন</p>
                </div>

                <div 
                  onClick={() => setShippingInfo({ ...shippingInfo, paymentMethod: 'cod' })}
                  className={`p-3.5 rounded-xl border transition-all cursor-pointer flex items-center gap-3 bg-white ${
                    shippingInfo.paymentMethod === 'cod'
                      ? 'border-blue-500 ring-2 ring-blue-500/20 shadow-xs'
                      : 'border-slate-200 hover:border-slate-300'
                  }`}
                >
                  <div className={`w-5 h-5 rounded-full border flex items-center justify-center shrink-0 ${
                    shippingInfo.paymentMethod === 'cod' ? 'border-blue-600 bg-blue-600' : 'border-slate-300'
                  }`}>
                    {shippingInfo.paymentMethod === 'cod' && <div className="w-2 h-2 rounded-full bg-white" />}
                  </div>

                  {/* Cash Icon */}
                  <div className="flex items-center gap-2">
                    <svg className="w-7 h-7 text-emerald-600 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <rect x="2" y="6" width="20" height="12" rx="2" />
                      <circle cx="12" cy="12" r="3" />
                      <path d="M6 12h0.01M18 12h0.01" />
                    </svg>
                    <span className="text-sm font-bold text-black">ক্যাশ অন ডেলিভারি</span>
                  </div>
                </div>

                {/* Checkbox: Save Payment Method for COD */}
                <div className="pt-1.5 flex items-center gap-2 text-xs text-black">
                  <input
                    type="checkbox"
                    id="save-payment-cod"
                    checked={shippingInfo.savePaymentMethod}
                    onChange={e => setShippingInfo({ ...shippingInfo, savePaymentMethod: e.target.checked })}
                    className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 border-slate-300 cursor-pointer"
                  />
                  <label htmlFor="save-payment-cod" className="cursor-pointer font-medium text-black">Save Payment Method</label>
                </div>
              </div>

              {/* CATEGORY 2: মোবাইল ওয়ালেট (Mobile Wallet) */}
              <div className="mb-6 space-y-2">
                <div className="text-left">
                  <h4 className="font-bold text-sm text-black">মোবাইল ওয়ালেট</h4>
                  <p className="text-xs font-medium text-black">মোবাইল ওয়ালেট মাধ্যমে টাকা পরিশোধ করুন</p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  
                  {/* bKash */}
                  <div
                    onClick={() => setShippingInfo({ ...shippingInfo, paymentMethod: 'bkash' })}
                    className={`p-3 rounded-xl border transition-all cursor-pointer flex items-center gap-2.5 bg-white ${
                      shippingInfo.paymentMethod === 'bkash'
                        ? 'border-blue-500 ring-2 ring-blue-500/20 shadow-xs'
                        : 'border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    <div className={`w-4 h-4 rounded-full border flex items-center justify-center shrink-0 ${
                      shippingInfo.paymentMethod === 'bkash' ? 'border-blue-600 bg-blue-600' : 'border-slate-300'
                    }`}>
                      {shippingInfo.paymentMethod === 'bkash' && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                    </div>

                    <div className="flex items-center gap-1.5">
                      <div className="bg-[#e2136e] text-white px-2 py-0.5 rounded font-bold text-xs tracking-tight shadow-xs">
                        bKash
                      </div>
                      <span className="text-xs font-medium text-black">বিকাশ</span>
                    </div>
                  </div>

                  {/* Nagad */}
                  <div
                    onClick={() => setShippingInfo({ ...shippingInfo, paymentMethod: 'nagad' })}
                    className={`p-3 rounded-xl border transition-all cursor-pointer flex items-center gap-2.5 bg-white ${
                      shippingInfo.paymentMethod === 'nagad'
                        ? 'border-blue-500 ring-2 ring-blue-500/20 shadow-xs'
                        : 'border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    <div className={`w-4 h-4 rounded-full border flex items-center justify-center shrink-0 ${
                      shippingInfo.paymentMethod === 'nagad' ? 'border-blue-600 bg-blue-600' : 'border-slate-300'
                    }`}>
                      {shippingInfo.paymentMethod === 'nagad' && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                    </div>

                    <div className="flex items-center gap-1.5">
                      <div className="bg-gradient-to-r from-orange-500 to-red-600 text-white px-2 py-0.5 rounded font-bold text-xs tracking-tight shadow-xs">
                        নগদ
                      </div>
                      <span className="text-xs font-medium text-black">Nagad</span>
                    </div>
                  </div>

                  {/* Rocket */}
                  <div
                    onClick={() => setShippingInfo({ ...shippingInfo, paymentMethod: 'rocket' })}
                    className={`p-3 rounded-xl border transition-all cursor-pointer flex items-center gap-2.5 bg-white ${
                      shippingInfo.paymentMethod === 'rocket'
                        ? 'border-blue-500 ring-2 ring-blue-500/20 shadow-xs'
                        : 'border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    <div className={`w-4 h-4 rounded-full border flex items-center justify-center shrink-0 ${
                      shippingInfo.paymentMethod === 'rocket' ? 'border-blue-600 bg-blue-600' : 'border-slate-300'
                    }`}>
                      {shippingInfo.paymentMethod === 'rocket' && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                    </div>

                    <div className="flex items-center gap-1.5">
                      <div className="bg-[#8c3494] text-white px-2 py-0.5 rounded font-bold text-xs tracking-tight shadow-xs">
                        রকেট
                      </div>
                      <span className="text-xs font-medium text-black">Rocket</span>
                    </div>
                  </div>

                </div>

                {/* Checkbox: Save Payment Method for Mobile Wallet */}
                <div className="pt-1.5 flex items-center gap-2 text-xs text-black">
                  <input
                    type="checkbox"
                    id="save-payment-wallet"
                    checked={shippingInfo.savePaymentMethod}
                    onChange={e => setShippingInfo({ ...shippingInfo, savePaymentMethod: e.target.checked })}
                    className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 border-slate-300 cursor-pointer"
                  />
                  <label htmlFor="save-payment-wallet" className="cursor-pointer font-medium text-black">Save Payment Method</label>
                </div>
              </div>

              {/* CATEGORY 3: ডেবিট / ক্রেডিট কার্ড (Debit / Credit Card) */}
              <div className="space-y-2">
                <div className="text-left">
                  <h4 className="font-bold text-sm text-black">ডেবিট / ক্রেডিট কার্ড</h4>
                  <p className="text-xs font-medium text-black">কার্ড এর মাধ্যমে টাকা পরিশোধ করুন</p>
                </div>

                <div 
                  onClick={() => setShippingInfo({ ...shippingInfo, paymentMethod: 'card' })}
                  className={`p-3.5 rounded-xl border transition-all cursor-pointer flex items-center justify-between flex-wrap gap-3 bg-white ${
                    shippingInfo.paymentMethod === 'card'
                      ? 'border-blue-500 ring-2 ring-blue-500/20 shadow-xs'
                      : 'border-slate-200 hover:border-slate-300'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-5 h-5 rounded-full border flex items-center justify-center shrink-0 ${
                      shippingInfo.paymentMethod === 'card' ? 'border-blue-600 bg-blue-600' : 'border-slate-300'
                    }`}>
                      {shippingInfo.paymentMethod === 'card' && <div className="w-2 h-2 rounded-full bg-white" />}
                    </div>

                    {/* Bank Operator Logos */}
                    <div className="flex items-center flex-wrap gap-1.5">
                      <div className="bg-[#1a1f71] text-white px-2 py-1 rounded font-bold text-xs italic tracking-tighter shadow-xs border border-blue-900">
                        VISA
                      </div>
                      
                      <div className="bg-slate-900 text-white px-2 py-1 rounded font-bold text-xs flex items-center gap-1 shadow-xs border border-slate-800">
                        <span className="flex shrink-0">
                          <span className="w-2.5 h-2.5 rounded-full bg-red-500 inline-block -mr-1" />
                          <span className="w-2.5 h-2.5 rounded-full bg-amber-400 inline-block opacity-90" />
                        </span>
                        <span className="text-[10px]">mastercard</span>
                      </div>

                      <div className="bg-[#006fcf] text-white px-2 py-1 rounded font-bold text-[10px] tracking-tighter uppercase shadow-xs">
                        AMEX
                      </div>

                      <div className="bg-emerald-800 text-white px-1.5 py-1 rounded font-bold text-[10px] flex items-center gap-0.5 shadow-xs">
                        <span className="bg-red-500 px-0.5 text-[8px]">Union</span>
                        <span className="bg-blue-600 px-0.5 text-[8px]">Pay</span>
                      </div>

                      <div className="bg-red-600 text-white px-2 py-1 rounded font-bold text-[10px] italic shadow-xs">
                        QCash
                      </div>
                    </div>
                  </div>
                </div>

                {/* Checkbox: Save Payment Method */}
                <div className="pt-2 flex items-center gap-2 text-xs text-black">
                  <input
                    type="checkbox"
                    id="save-payment"
                    checked={shippingInfo.savePaymentMethod}
                    onChange={e => setShippingInfo({ ...shippingInfo, savePaymentMethod: e.target.checked })}
                    className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 border-slate-300 cursor-pointer"
                  />
                  <label htmlFor="save-payment" className="cursor-pointer font-medium text-black">Save Payment Method</label>
                </div>
              </div>
            </div>

            {/* REFERENCE EXACT DESIGN: Add Address Box */}
            <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs text-left space-y-4">
              <h3 className="text-xl font-bold text-black">Add Address</h3>

              <div className="space-y-3.5">
                {/* Input 1: Full Name */}
                <div>
                  <input
                    type="text"
                    required
                    placeholder="Full Name / নাম"
                    value={shippingInfo.name}
                    onChange={e => setShippingInfo({ ...shippingInfo, name: e.target.value })}
                    className="w-full bg-white border border-blue-400 rounded-xl px-4 py-3 text-sm font-medium text-black focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                {/* Input 2: Mobile Number */}
                <div>
                  <input
                    type="tel"
                    required
                    placeholder="8801756482001"
                    value={shippingInfo.phone}
                    onChange={e => setShippingInfo({ ...shippingInfo, phone: e.target.value })}
                    className="w-full bg-white border border-blue-400 rounded-xl px-4 py-3 text-sm font-medium text-black focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                {/* Input 3: Alt. Mobile Number */}
                <div>
                  <input
                    type="tel"
                    placeholder="Alt. Mobile Number"
                    value={shippingInfo.altPhone}
                    onChange={e => setShippingInfo({ ...shippingInfo, altPhone: e.target.value })}
                    className="w-full bg-white border border-slate-300 rounded-xl px-4 py-3 text-sm font-medium text-black focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                {/* Input 4: Country Dropdown */}
                <div>
                  <select
                    value={shippingInfo.country}
                    onChange={e => setShippingInfo({ ...shippingInfo, country: e.target.value })}
                    className="w-full bg-white border border-blue-400 rounded-xl px-4 py-3 text-sm font-medium text-black focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
                  >
                    <option value="বাংলাদেশ">বাংলাদেশ</option>
                  </select>
                </div>

                {/* Input 5 & 6: District & Thana Selectors */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-black mb-1">জেলা (Select District - 64 Districts) *</label>
                    <select
                      value={shippingInfo.district}
                      onChange={e => handleDistrictChange(e.target.value)}
                      className="w-full bg-white border border-blue-400 rounded-xl px-4 py-3 text-sm font-medium text-black focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
                    >
                      {Object.keys(BD_DISTRICTS_DATA).map(dist => (
                        <option key={dist} value={dist}>
                          {dist === 'Dhaka' ? 'ঢাকা (Dhaka - ৳80)' : `${dist} (৳150)`}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-black mb-1">থানা / এলাকা (Thana / Upazila - টাইপ বা সিলেক্ট করুন) *</label>
                    <div className="relative">
                      <input
                        type="text"
                        list="thana-list-options"
                        required
                        placeholder="থানার নাম লিখুন বা সিলেক্ট করুন..."
                        value={shippingInfo.thana}
                        onChange={e => setShippingInfo({ ...shippingInfo, thana: e.target.value })}
                        className="w-full bg-white border border-blue-400 rounded-xl px-4 py-3 text-sm font-medium text-black focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                      <datalist id="thana-list-options">
                        {districtThanas.map((th, idx) => (
                          <option key={idx} value={th} />
                        ))}
                      </datalist>
                    </div>

                    {/* Quick suggestion pills for instant 1-tap selection */}
                    <div className="flex flex-wrap gap-1.5 mt-2 max-h-24 overflow-y-auto p-1 bg-slate-50 rounded-lg border border-slate-200">
                      <span className="text-[10px] text-slate-500 font-bold w-full">দ্রুত সিলেক্ট করুন:</span>
                      {districtThanas.map((th, idx) => (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => setShippingInfo({ ...shippingInfo, thana: th })}
                          className={`px-2 py-0.5 rounded-md text-xs font-medium transition-all cursor-pointer ${
                            shippingInfo.thana === th
                              ? 'bg-blue-600 text-white font-bold'
                              : 'bg-white border border-slate-300 text-black hover:bg-slate-100'
                          }`}
                        >
                          {th}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Input 7: Full Address Textarea */}
                <div>
                  <textarea
                    rows={2}
                    required
                    placeholder="বাসা/ফ্ল্যাট নম্বর, পাড়া-মহল্লার নাম, পরিচিতির এলাকা উল্লেখ করুন"
                    value={shippingInfo.fullAddressDetails}
                    onChange={e => setShippingInfo({ ...shippingInfo, fullAddressDetails: e.target.value })}
                    className="w-full bg-white border border-slate-300 rounded-xl px-4 py-3 text-sm font-medium text-black focus:outline-none focus:ring-2 focus:ring-blue-500"
                  ></textarea>
                </div>

                {/* Field 8: Select Address Type * */}
                <div className="space-y-2 pt-1">
                  <label className="block text-sm font-medium text-black">
                    Select Address Type <span className="text-red-500">*</span>
                  </label>
                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      onClick={() => setShippingInfo({ ...shippingInfo, addressType: 'Home' })}
                      className={`px-6 py-2 rounded-xl border text-sm font-medium transition-all cursor-pointer ${
                        shippingInfo.addressType === 'Home'
                          ? 'border-blue-500 bg-blue-50 text-black shadow-xs font-bold'
                          : 'border-slate-300 text-black hover:bg-slate-100'
                      }`}
                    >
                      Home
                    </button>
                    <button
                      type="button"
                      onClick={() => setShippingInfo({ ...shippingInfo, addressType: 'Office' })}
                      className={`px-6 py-2 rounded-xl border text-sm font-medium transition-all cursor-pointer ${
                        shippingInfo.addressType === 'Office'
                          ? 'border-blue-500 bg-blue-50 text-black shadow-xs font-bold'
                          : 'border-slate-300 text-black hover:bg-slate-100'
                      }`}
                    >
                      Office
                    </button>
                  </div>
                </div>

                {/* Field 9: Save & Proceed Primary Cyan/Blue Button */}
                <div className="pt-3">
                  <button
                    type="button"
                    onClick={() => handleSubmit()}
                    disabled={submitting}
                    className="w-full bg-[#0092d8] hover:bg-[#0081c2] text-white font-medium text-base py-3.5 rounded-xl shadow-sm transition-all cursor-pointer disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    <span>{submitting ? 'সেভ হচ্ছে...' : 'সেভ করে এগিয়ে যান'}</span>
                  </button>
                </div>

              </div>
            </div>

          </div>

          {/* RIGHT COLUMN: Checkout Summary Card */}
          <div className="lg:col-span-1 space-y-4">
            <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm text-left space-y-4 sticky top-4">
              
              {/* Summary Header */}
              <div className="border-b border-slate-200 pb-3">
                <h3 className="text-base font-bold text-black">Checkout Summary</h3>
              </div>

              {/* Price Breakdown List */}
              <div className="space-y-3 text-xs sm:text-sm">
                <div className="flex justify-between items-center text-black">
                  <span className="font-medium">Subtotal</span>
                  <span className="font-bold text-black">৳{subtotalForCalc}</span>
                </div>

                <div className="flex justify-between items-center text-black">
                  <span className="font-medium">Delivery Charge ({isInsideDhaka ? 'ঢাকার ভেতরে' : 'ঢাকার বাইরে'})</span>
                  <span className="font-bold text-black">৳{deliveryCharge}</span>
                </div>

                {appliedPromo && (
                  <div className="flex justify-between items-center text-black">
                    <span className="font-medium">Voucher Discount ({appliedPromo.code})</span>
                    <span className="font-bold text-black">-৳{appliedPromo.discount}</span>
                  </div>
                )}

                <div className="border-t border-slate-200 pt-3 flex justify-between items-center text-black text-sm sm:text-base">
                  <span className="font-medium">Total</span>
                  <span className="font-extrabold text-black text-base sm:text-lg">৳{payableTotal}</span>
                </div>
              </div>

              {/* Primary Action Button: "অর্ডার নিশ্চিত করুন ৳..." */}
              <button
                type="button"
                onClick={() => handleSubmit()}
                disabled={submitting}
                className="w-full py-3.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm sm:text-base rounded-xl shadow-lg transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
              >
                <span>{submitting ? 'অর্ডার জমা হচ্ছে...' : `অর্ডার নিশ্চিত করুন ৳${payableTotal}`}</span>
              </button>

            </div>
          </div>

        </div>
      </motion.div>
    </div>
  );
}
