import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  ShieldCheck, 
  ArrowLeft, 
  Check, 
  ShoppingBag, 
  Truck, 
  CreditCard, 
  Tag, 
  AlertCircle, 
  ChevronRight, 
  X, 
  Phone, 
  MapPin, 
  CheckCircle2 
} from 'lucide-react';

interface CartItem {
  product: any;
  quantity: number;
  size?: string;
  color?: string;
  selected?: boolean;
}

interface CheckoutModalProps {
  isOpen?: boolean;
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
  isOpen = true,
  onClose,
  cart,
  authUser,
  onSubmitOrder,
  notify
}: CheckoutModalProps) {
  const userAddr = authUser?.saved_address || authUser?.savedAddress;

  const [shippingInfo, setShippingInfo] = useState({
    name: userAddr?.fullName || '',
    phone: userAddr?.phoneNumber || '',
    altPhone: userAddr?.altPhone || '',
    country: userAddr?.country || 'বাংলাদেশ',
    district: userAddr?.district || '',
    thana: userAddr?.thana || '',
    fullAddressDetails: userAddr?.addressDetails || '',
    addressType: (userAddr?.addressType as 'Home' | 'Office') || 'Home',
    paymentMethod: 'card' as 'card' | 'cod' | 'bkash' | 'nagad' | 'rocket'
  });

  // Independent boolean state for each payment method's 'Save Payment Method' checkbox
  const [savedPaymentMethods, setSavedPaymentMethods] = useState({
    cod: true,
    wallet: true,
    card: true
  });

  const [promoCodeInput, setPromoCodeInput] = useState('');
  const [appliedPromo, setAppliedPromo] = useState<{ code: string; discount: number } | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [addressLoadedFromDb, setAddressLoadedFromDb] = useState(false);
  const [savingAddress, setSavingAddress] = useState(false);
  const [isAddingNewAddress, setIsAddingNewAddress] = useState(false);
  const [showNoAddressError, setShowNoAddressError] = useState(false);

  // Fetch saved delivery address on component load (useEffect) and automatically pre-fill form
  useEffect(() => {
    let isMounted = true;

    const fetchSavedAddress = async () => {
      try {
        const activeToken = localStorage.getItem('bazaarpulse_token') || '';
        const userParams = new URLSearchParams();
        if (authUser?.id) userParams.append('userId', authUser.id);
        if (authUser?.email) userParams.append('email', authUser.email);

        const url = `/api/user/address${userParams.toString() ? '?' + userParams.toString() : ''}`;
        const res = await fetch(url, {
          headers: {
            'Content-Type': 'application/json',
            ...(activeToken ? { 'Authorization': `Bearer ${activeToken}` } : {})
          }
        });

        if (res.ok) {
          const data = await res.json();
          if (isMounted && data.success && data.address) {
            const addr = data.address;
            setShippingInfo(prev => ({
              ...prev,
              name: addr.fullName || '',
              phone: addr.phoneNumber || '',
              altPhone: addr.altPhone || '',
              district: addr.district || '',
              thana: addr.thana || '',
              fullAddressDetails: addr.addressDetails || prev.fullAddressDetails,
              addressType: (addr.addressType as any) || prev.addressType
            }));
            setAddressLoadedFromDb(true);
            return;
          }
        }
      } catch (err) {
        console.warn('Failed to fetch address from API, attempting local fallback:', err);
      }

      // Local storage fallback for instant response
      try {
        const localSaved = localStorage.getItem('bazaarpulse_saved_address');
        if (localSaved && isMounted) {
          const parsed = JSON.parse(localSaved);
          if (parsed && (parsed.fullName || parsed.addressDetails)) {
            setShippingInfo(prev => ({
              ...prev,
              name: parsed.fullName || '',
              phone: parsed.phoneNumber || '',
              altPhone: parsed.altPhone || '',
              district: parsed.district || '',
              thana: parsed.thana || '',
              fullAddressDetails: parsed.addressDetails || prev.fullAddressDetails,
              addressType: (parsed.addressType as any) || prev.addressType
            }));
            setAddressLoadedFromDb(true);
          }
        }
      } catch (e) {}
    };

    fetchSavedAddress();

    return () => {
      isMounted = false;
    };
  }, [authUser?.id, authUser?.email]);

  const handleManualSaveAddress = async () => {
    if (!shippingInfo.name.trim() || !shippingInfo.phone.trim()) {
      notify('⚠️ নাম এবং ফোন নম্বর লিখুন');
      return;
    }
    if (!shippingInfo.fullAddressDetails.trim()) {
      notify('⚠️ বিস্তারিত ঠিকানা উল্লেখ করুন');
      return;
    }
    setSavingAddress(true);
    try {
      const activeToken = localStorage.getItem('bazaarpulse_token') || '';
      const payload = {
        fullName: shippingInfo.name.trim(),
        phoneNumber: shippingInfo.phone.trim(),
        district: shippingInfo.district,
        thana: shippingInfo.thana,
        addressDetails: shippingInfo.fullAddressDetails.trim(),
        altPhone: shippingInfo.altPhone.trim(),
        addressType: shippingInfo.addressType,
        userId: authUser?.id,
        email: authUser?.email
      };

      const res = await fetch('/api/user/address', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(activeToken ? { 'Authorization': `Bearer ${activeToken}` } : {})
        },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (data.success) {
        localStorage.setItem('bazaarpulse_saved_address', JSON.stringify(payload));
        setAddressLoadedFromDb(true);
        notify('✅ ডেলিভারি ঠিকানা ডেটাবেজে সফলভাবে সংরক্ষিত হয়েছে!');
      } else {
        notify('❌ ঠিকানা সংরক্ষণ করা যায়নি: ' + (data.error || ''));
      }
    } catch (err: any) {
      notify('❌ সার্ভার ত্রুটি: ' + err.message);
    } finally {
      setSavingAddress(false);
    }
  };

  // Selected cart items or all cart items if non-selected
  const activeItems = cart.filter(i => i.selected !== false);
  const itemsToCheckout = activeItems.length > 0 ? activeItems : cart;

  // Financial calculations
  const rawSubtotal = itemsToCheckout.reduce((sum, item) => sum + (item.product.price * item.quantity), 0);
  const discountedSubtotal = itemsToCheckout.reduce((sum, item) => sum + ((item.product.discountPrice || item.product.price) * item.quantity), 0);

  // Delivery Charge calculation based on selected district
  const isInsideDhaka = shippingInfo.district === 'Dhaka' || shippingInfo.district === 'ঢাকা';
  const deliveryCharge = isInsideDhaka ? 80 : 150;

  // Promo handling
  const handleApplyPromo = () => {
    const code = promoCodeInput.trim().toUpperCase();
    if (!code) return;

    if (code === 'BAZAAR50') {
      setAppliedPromo({ code, discount: 50 });
      notify('🎉 প্রোমো কোড BAZAAR50 প্রয়োগ করা হয়েছে! ৳৫০ ছাড়');
    } else if (code === 'WELCOME100') {
      if (discountedSubtotal < 500) {
        notify('⚠️ WELCOME100 কোডের জন্য ন্যূনতম ৳৫০০ অর্ডারের প্রয়োজন');
        return;
      }
      setAppliedPromo({ code, discount: 100 });
      notify('🎉 প্রোমো কোড WELCOME100 প্রয়োগ করা হয়েছে! ৳১০০ ছাড়');
    } else if (code === 'SAVE10') {
      const tenPercent = Math.round(discountedSubtotal * 0.1);
      setAppliedPromo({ code, discount: tenPercent });
      notify(`🎉 প্রোমো কোড SAVE10 প্রয়োগ করা হয়েছে! ৳${tenPercent} ছাড় (১০%)`);
    } else if (code === 'EID2026') {
      setAppliedPromo({ code, discount: 150 });
      notify('🎉 ঈদ অফার কোড EID2026 প্রয়োগ করা হয়েছে! ৳১৫০ ছাড়');
    } else {
      notify('❌ দুঃখিত, এই কুপন কোডটি সঠিক নয় বা মেয়াদোত্তীর্ণ');
    }
  };

  const handleRemovePromo = () => {
    setAppliedPromo(null);
    setPromoCodeInput('');
    notify('কুপন কোড সরানো হয়েছে');
  };

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

    if (itemsToCheckout.length === 0) {
      notify('⚠️ আপনার কার্টে কোনো পণ্য নেই!');
      return;
    }

    if (!shippingInfo.name.trim() || !shippingInfo.phone.trim()) {
      notify('⚠️ অনুগ্রহ করে আপনার নাম ও মোবাইল নম্বর প্রদান করুন');
      return;
    }

    if (!shippingInfo.fullAddressDetails.trim()) {
      setShowNoAddressError(true);
      return;
    }

    setSubmitting(true);
    try {
      // Save address to user profile in backend database and local storage so future checkouts are pre-filled
      try {
        const activeToken = localStorage.getItem('bazaarpulse_token') || '';
        const addressPayload = {
          fullName: shippingInfo.name.trim(),
          phoneNumber: shippingInfo.phone.trim(),
          district: shippingInfo.district,
          thana: shippingInfo.thana,
          addressDetails: shippingInfo.fullAddressDetails.trim(),
          altPhone: shippingInfo.altPhone.trim(),
          addressType: shippingInfo.addressType,
          userId: authUser?.id,
          email: authUser?.email
        };

        fetch('/api/user/address', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(activeToken ? { 'Authorization': `Bearer ${activeToken}` } : {})
          },
          body: JSON.stringify(addressPayload)
        }).catch(err => console.warn('Background address save failed:', err));

        localStorage.setItem('bazaarpulse_saved_address', JSON.stringify(addressPayload));
      } catch (e) {
        console.warn('Error saving address locally:', e);
      }

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
        fullName: shippingInfo.name,
        phoneNumber: shippingInfo.phone,
        district: shippingInfo.district,
        thana: shippingInfo.thana,
        addressDetails: shippingInfo.fullAddressDetails,
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

  // Empty checkout state
  if (itemsToCheckout.length === 0) {
    return (
      <div className="w-full max-w-4xl mx-auto px-4 py-16 text-center">
        <div className="bg-white border border-slate-200 rounded-2xl p-8 sm:p-12 shadow-sm space-y-5">
          <div className="w-20 h-20 bg-orange-50 text-[#f85606] rounded-full flex items-center justify-center mx-auto">
            <ShoppingBag className="w-10 h-10" />
          </div>
          <h2 className="text-2xl font-black text-slate-900">আপনার কার্ট বর্তমানে খালি আছে</h2>
          <p className="text-sm text-slate-500 max-w-md mx-auto">
            চেকআউট সম্পন্ন করার জন্য অনুগ্রহ করে বাজার প্লাসের পছন্দের পণ্যগুলো কার্টে যোগ করুন।
          </p>
          <div className="pt-2">
            <button
              onClick={onClose}
              className="inline-flex items-center gap-2 bg-[#f85606] hover:bg-[#e04d05] text-white font-bold px-6 py-3 rounded-xl shadow-md transition-all cursor-pointer"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>কেনাকাটা শুরু করুন</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Dedicated Full Page (SPA View) Layout - No modal wrapper, no fixed position, no dark overlay
  return (
    <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 md:py-8 space-y-6">
      
      {/* 1. Breadcrumbs & Back Navigation */}
      <div className="flex flex-wrap items-center justify-between gap-4 pb-2 border-b border-slate-200">
        <div className="flex items-center gap-2 text-xs sm:text-sm text-slate-500 font-medium">
          <button 
            type="button"
            onClick={onClose} 
            className="hover:text-[#f85606] transition-colors cursor-pointer flex items-center gap-1"
          >
            হোম (Home)
          </button>
          <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
          <button 
            type="button"
            onClick={onClose} 
            className="hover:text-[#f85606] transition-colors cursor-pointer"
          >
            কার্ট (Cart)
          </button>
          <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
          <span className="text-slate-900 font-bold">চেকআউট (Checkout)</span>
        </div>

        <button
          type="button"
          onClick={onClose}
          className="inline-flex items-center gap-1.5 text-xs sm:text-sm font-bold text-slate-700 hover:text-[#f85606] bg-white border border-slate-200 hover:border-orange-300 px-3.5 py-1.5 rounded-xl transition-all shadow-xs cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>কেনাকাটায় ফিরে যান (Continue Shopping)</span>
        </button>
      </div>

      {/* No Address Error View (Reference Image) */}
      <AnimatePresence>
        {showNoAddressError && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-950/50 backdrop-blur-sm">
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white rounded-2xl p-8 max-w-sm w-full text-center shadow-2xl space-y-6"
            >
              <div className="space-y-2">
                <h3 className="text-xl font-bold text-slate-900">কোনো শিপিং এড্রেস নেই!</h3>
                <p className="text-sm text-slate-600 leading-relaxed">
                  অর্ডার সম্পন্ন করতে দয়া করে একটি শিপিং এড্রেস যোগ করুন।
                </p>
              </div>

              <button
                type="button"
                onClick={() => {
                  setShowNoAddressError(false);
                  setIsAddingNewAddress(true);
                  // Scroll to address section if needed
                  const addrEl = document.getElementById('address-form-section');
                  if (addrEl) addrEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
                }}
                className="w-full py-3 bg-[#4096ff] hover:bg-[#3285e6] text-white font-bold rounded-xl shadow-md transition-all cursor-pointer flex items-center justify-center gap-2"
              >
                <span>+ Add Address</span>
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Main Grid: Left Column (Payment & Address), Right Column (Review, Summary & Confirm) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        
        {/* LEFT COLUMN: Payment Methods & Add Address Form */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* Payment Method Header Box */}
          <div className="bg-white border border-slate-200 rounded-2xl p-5 sm:p-6 shadow-xs text-left">
            <div className="border-b border-slate-100 pb-3 mb-4">
              <h2 className="text-lg font-bold text-black flex items-center gap-2">
                <CreditCard className="w-5 h-5 text-blue-600" />
                Payment Method (পেমেন্ট পদ্ধতি)
              </h2>
              <p className="text-xs font-medium text-slate-500">অনুগ্রহ করে আপনার পছন্দের পেমেন্ট পদ্ধতি বেছে নিন</p>
            </div>

            {/* CATEGORY 1: ক্যাশ অন ডেলিভারি (Cash on Delivery) */}
            <div className="mb-6 space-y-2">
              <div className="text-left">
                <h3 className="font-bold text-sm text-black">ক্যাশ অন ডেলিভারি (Cash on Delivery)</h3>
                <p className="text-xs font-medium text-slate-500">পণ্য হাতে পেয়ে দেখে টাকা পরিশোধ করুন</p>
              </div>

              <div 
                onClick={() => setShippingInfo({ ...shippingInfo, paymentMethod: 'cod' })}
                className={`p-3.5 rounded-xl border transition-all cursor-pointer flex items-center justify-between bg-white ${
                  shippingInfo.paymentMethod === 'cod'
                    ? 'border-blue-500 ring-2 ring-blue-500/20 shadow-xs'
                    : 'border-slate-200 hover:border-slate-300'
                }`}
              >
                <div className="flex items-center gap-3">
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
                    <div>
                      <span className="text-sm font-bold text-black block">ক্যাশ অন ডেলিভারি (COD)</span>
                      <span className="text-[11px] text-slate-500">অগ্রিম কোনো পেমেন্ট ছাড়া পণ্য বুঝে পেয়ে টাকা দিন</span>
                    </div>
                  </div>
                </div>

                <span className="text-xs font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-100">
                  জনপ্রিয়
                </span>
              </div>

              {/* Checkbox: Save Payment Method for COD */}
              <div className="pt-1.5 flex items-center gap-2 text-xs text-black">
                <input
                  type="checkbox"
                  id="save-payment-cod"
                  checked={savedPaymentMethods.cod}
                  onChange={e => setSavedPaymentMethods(prev => ({ ...prev, cod: e.target.checked }))}
                  className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 border-slate-300 cursor-pointer"
                />
                <label htmlFor="save-payment-cod" className="cursor-pointer font-medium text-black">
                  পরবর্তী অর্ডারের জন্য পেমেন্ট পদ্ধতি সেভ করে রাখুন
                </label>
              </div>
            </div>

            {/* CATEGORY 2: মোবাইল ওয়ালেট (Mobile Wallet) */}
            <div className="mb-6 space-y-2">
              <div className="text-left">
                <h3 className="font-bold text-sm text-black">মোবাইল ওয়ালেট (Mobile Banking)</h3>
                <p className="text-xs font-medium text-slate-500">বিকাশ, নগদ বা রকেট এর মাধ্যমে নিরাপদে তাৎক্ষণিক পেমেন্ট করুন</p>
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
                  checked={savedPaymentMethods.wallet}
                  onChange={e => setSavedPaymentMethods(prev => ({ ...prev, wallet: e.target.checked }))}
                  className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 border-slate-300 cursor-pointer"
                />
                <label htmlFor="save-payment-wallet" className="cursor-pointer font-medium text-black">Save Payment Method</label>
              </div>
            </div>

            {/* CATEGORY 3: ডেবিট / ক্রেডিট কার্ড (Debit / Credit Card) */}
            <div className="space-y-2">
              <div className="text-left">
                <h3 className="font-bold text-sm text-black">ডেবিট / ক্রেডিট কার্ড (Debit / Credit Card)</h3>
                <p className="text-xs font-medium text-slate-500">ভিসা, মাস্টারকার্ড বা অন্যান্য কার্ডের মাধ্যমে দ্রুত পেমেন্ট</p>
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
                  id="save-payment-card"
                  checked={savedPaymentMethods.card}
                  onChange={e => setSavedPaymentMethods(prev => ({ ...prev, card: e.target.checked }))}
                  className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 border-slate-300 cursor-pointer"
                />
                <label htmlFor="save-payment-card" className="cursor-pointer font-medium text-black">Save Payment Method</label>
              </div>
            </div>
          </div>

          {/* REFERENCE EXACT DESIGN: Add Address Box */}
          <div id="address-form-section" className="bg-white border border-slate-200 rounded-2xl p-5 sm:p-6 shadow-xs text-left space-y-4">
            <div className="pb-3">
              <h2 className="text-lg font-bold text-slate-900">Shipping Address</h2>
            </div>

            {!isAddingNewAddress && !addressLoadedFromDb ? (
              <button
                type="button"
                onClick={() => setIsAddingNewAddress(true)}
                className="w-full py-4 border border-blue-500 rounded-xl bg-white text-blue-500 font-bold text-sm flex items-center justify-center gap-2 hover:bg-blue-50 transition-all cursor-pointer group"
              >
                <Plus className="w-4 h-4 group-hover:scale-110 transition-transform" />
                <span>+ Add Shipping Address</span>
              </button>
            ) : (
              <>
                <div className="border-b border-slate-100 pb-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <h2 className="text-lg sm:text-xl font-bold text-black flex items-center gap-2">
                      <MapPin className="w-5 h-5 text-blue-600" />
                      Add Address (ডেলিভারির ঠিকানা)
                    </h2>
                    <p className="text-xs font-medium text-slate-500">যে ঠিকানায় আপনার পণ্য পৌঁছে দেওয়া হবে</p>
                  </div>

                  <div className="flex items-center gap-2 flex-wrap">
                    {addressLoadedFromDb && (
                      <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-lg">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                        <span>সেভ করা ঠিকানা প্রি-ফিল্ড</span>
                      </span>
                    )}
                    <button
                      type="button"
                      onClick={handleManualSaveAddress}
                      disabled={savingAddress}
                      className="inline-flex items-center gap-1 text-xs font-bold text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200 px-3 py-1 rounded-lg transition-colors cursor-pointer disabled:opacity-50"
                    >
                      {savingAddress ? 'সেভ হচ্ছে...' : 'ঠিকানা সেভ করুন'}
                    </button>
                    {(isAddingNewAddress || addressLoadedFromDb) && (
                      <button
                        type="button"
                        onClick={() => setIsAddingNewAddress(false)}
                        className="text-xs font-bold text-slate-500 hover:text-red-500 px-2 py-1 transition-colors cursor-pointer"
                      >
                        বাতিল
                      </button>
                    )}
                  </div>
                </div>

                <div className="space-y-4">
                  {/* Input 1: Full Name */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Full Name / প্রাপকের নাম <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="Full Name / নাম লিখুন"
                      value={shippingInfo.name}
                      onChange={e => setShippingInfo({ ...shippingInfo, name: e.target.value })}
                      className="w-full bg-white border border-slate-300 rounded-xl px-4 py-2.5 text-sm font-medium text-black focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                    />
                  </div>

                  {/* Input 2 & 3: Mobile Numbers */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        Mobile Number / মোবাইল নম্বর <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="tel"
                        required
                        placeholder="88017XXXXXXXX"
                        value={shippingInfo.phone}
                        onChange={e => setShippingInfo({ ...shippingInfo, phone: e.target.value })}
                        className="w-full bg-white border border-slate-300 rounded-xl px-4 py-2.5 text-sm font-medium text-black focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        Alt. Mobile Number (বিকল্প নম্বর - ঐচ্ছিক)
                      </label>
                      <input
                        type="tel"
                        placeholder="Alt. Mobile Number"
                        value={shippingInfo.altPhone}
                        onChange={e => setShippingInfo({ ...shippingInfo, altPhone: e.target.value })}
                        className="w-full bg-white border border-slate-300 rounded-xl px-4 py-2.5 text-sm font-medium text-black focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                      />
                    </div>
                  </div>

              {/* Input 4: Country Dropdown */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Country / দেশ</label>
                <select
                  value={shippingInfo.country}
                  onChange={e => setShippingInfo({ ...shippingInfo, country: e.target.value })}
                  className="w-full bg-white border border-slate-300 rounded-xl px-4 py-2.5 text-sm font-medium text-black focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
                >
                  <option value="বাংলাদেশ">বাংলাদেশ (Bangladesh)</option>
                </select>
              </div>

              {/* Input 5 & 6: District & Thana Selectors */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    জেলা (Select District - 64 Districts) <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={shippingInfo.district}
                    onChange={e => handleDistrictChange(e.target.value)}
                    className="w-full bg-white border border-slate-300 rounded-xl px-4 py-2.5 text-sm font-medium text-black focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
                  >
                    {Object.keys(BD_DISTRICTS_DATA).map(dist => (
                      <option key={dist} value={dist}>
                        {dist === 'Dhaka' ? 'ঢাকা (Dhaka - ডেলিভারি ৳80)' : `${dist} (ডেলিভারি ৳150)`}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    থানা / এলাকা (Thana / Upazila) <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      list="thana-list-options"
                      required
                      placeholder="থানার নাম লিখুন বা সিলেক্ট করুন..."
                      value={shippingInfo.thana}
                      onChange={e => setShippingInfo({ ...shippingInfo, thana: e.target.value })}
                      className="w-full bg-white border border-slate-300 rounded-xl px-4 py-2.5 text-sm font-medium text-black focus:outline-none focus:ring-2 focus:ring-blue-500"
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
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  বিস্তারিত ঠিকানা (House, Road, Area) <span className="text-red-500">*</span>
                </label>
                <textarea
                  rows={2}
                  required
                  placeholder="বাসা/ফ্ল্যাট নম্বর, রোড নম্বর, পাড়া-মহল্লার নাম বা পরিচিত কোনো ল্যান্ডমার্ক উল্লেখ করুন"
                  value={shippingInfo.fullAddressDetails}
                  onChange={e => setShippingInfo({ ...shippingInfo, fullAddressDetails: e.target.value })}
                  className="w-full bg-white border border-slate-300 rounded-xl px-4 py-2.5 text-sm font-medium text-black focus:outline-none focus:ring-2 focus:ring-blue-500"
                ></textarea>
              </div>

              {/* Field 8: Select Address Type */}
              <div className="space-y-1.5 pt-1">
                <label className="block text-xs font-bold text-slate-700">
                  Select Address Type (ঠিকানার ধরন) <span className="text-red-500">*</span>
                </label>
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => setShippingInfo({ ...shippingInfo, addressType: 'Home' })}
                    className={`px-5 py-2 rounded-xl border text-xs sm:text-sm font-bold transition-all cursor-pointer ${
                      shippingInfo.addressType === 'Home'
                        ? 'border-blue-600 bg-blue-50 text-blue-700 shadow-xs'
                        : 'border-slate-300 text-slate-700 hover:bg-slate-100'
                    }`}
                  >
                    🏠 Home (বাসা)
                  </button>
                  <button
                    type="button"
                    onClick={() => setShippingInfo({ ...shippingInfo, addressType: 'Office' })}
                    className={`px-5 py-2 rounded-xl border text-xs sm:text-sm font-bold transition-all cursor-pointer ${
                      shippingInfo.addressType === 'Office'
                        ? 'border-blue-600 bg-blue-50 text-blue-700 shadow-xs'
                        : 'border-slate-300 text-slate-700 hover:bg-slate-100'
                    }`}
                  >
                    🏢 Office (অফিস)
                  </button>
                </div>
              </div>

              {/* Field 9: Save & Proceed Primary Cyan/Blue Button */}
              <div className="pt-2">
                <button
                  type="button"
                  onClick={() => handleSubmit()}
                  disabled={submitting}
                  className="w-full bg-[#0092d8] hover:bg-[#0081c2] text-white font-bold text-sm sm:text-base py-3 rounded-xl shadow-xs transition-all cursor-pointer disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  <CheckCircle2 className="w-5 h-5" />
                  <span>{submitting ? 'সেভ হচ্ছে...' : 'ঠিকানা সেভ করে অর্ডার জমা দিন'}</span>
                </button>
              </div>
            </div>
          </>
        )}
      </div>

        </div>

        {/* RIGHT COLUMN: Items List, Promo Box, Summary Card & Confirm Action */}
        <div className="lg:col-span-1 space-y-6">
          
          {/* Order Items Review Card */}
          <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs text-left">
            <div className="border-b border-slate-100 pb-3 mb-3 flex items-center justify-between">
              <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <ShoppingBag className="w-4 h-4 text-orange-600" />
                অর্ডারকৃত পণ্যসমূহ ({itemsToCheckout.length})
              </h2>
              <span className="text-[11px] font-bold text-slate-500">
                মোট: {itemsToCheckout.reduce((s, i) => s + i.quantity, 0)} পিস
              </span>
            </div>

            <div className="divide-y divide-slate-100 max-h-72 overflow-y-auto pr-1 space-y-2">
              {itemsToCheckout.map((item, idx) => {
                const img = Array.isArray(item.product.images) && item.product.images.length > 0
                  ? item.product.images[0]
                  : (item.product.image || item.product.images || 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=200');
                const price = item.product.discountPrice || item.product.price;

                return (
                  <div key={idx} className="pt-2 flex items-center gap-3">
                    <img 
                      src={img} 
                      alt={item.product.title} 
                      className="w-14 h-14 object-cover rounded-xl border border-slate-200 shrink-0 bg-slate-50"
                    />
                    <div className="flex-1 min-w-0">
                      <h3 className="text-xs font-bold text-slate-900 truncate">
                        {item.product.title}
                      </h3>
                      <div className="flex items-center gap-2 mt-0.5 text-[11px] text-slate-500">
                        <span>পরিমাণ: <strong className="text-slate-800">{item.quantity}</strong></span>
                        {item.size && <span className="bg-slate-100 px-1.5 py-0.2 rounded text-[10px] font-semibold">{item.size}</span>}
                        {item.color && <span className="bg-slate-100 px-1.5 py-0.2 rounded text-[10px] font-semibold">{item.color}</span>}
                      </div>
                      <div className="text-xs font-black text-orange-600 mt-0.5">
                        ৳{price * item.quantity}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Promo / Coupon Voucher Card */}
          <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs text-left space-y-2">
            <label className="block text-xs font-bold text-slate-800 flex items-center gap-1.5">
              <Tag className="w-3.5 h-3.5 text-blue-600" />
              ভাউচার কোড (Promo Code)
            </label>

            {appliedPromo ? (
              <div className="flex items-center justify-between bg-emerald-50 border border-emerald-200 p-2.5 rounded-xl">
                <div className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-emerald-600" />
                  <span className="text-xs font-black text-emerald-800">{appliedPromo.code}</span>
                  <span className="text-xs text-emerald-600 font-bold">(-৳{appliedPromo.discount})</span>
                </div>
                <button
                  type="button"
                  onClick={handleRemovePromo}
                  className="text-xs text-red-500 hover:text-red-700 font-bold cursor-pointer"
                >
                  মুছুন
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  placeholder="যেমন: BAZAAR50, WELCOME100"
                  value={promoCodeInput}
                  onChange={e => setPromoCodeInput(e.target.value)}
                  className="flex-1 bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs font-bold uppercase text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <button
                  type="button"
                  onClick={handleApplyPromo}
                  className="bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs px-4 py-2 rounded-xl transition-colors cursor-pointer"
                >
                  প্রয়োগ
                </button>
              </div>
            )}
          </div>

          {/* Checkout Summary Card */}
          <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm text-left space-y-4">
            
            {/* Summary Header */}
            <div className="border-b border-slate-200 pb-3">
              <h2 className="text-base font-bold text-black">Checkout Summary</h2>
            </div>

            {/* Price Breakdown List */}
            <div className="space-y-3 text-xs sm:text-sm">
              <div className="flex justify-between items-center text-black">
                <span className="font-medium text-slate-600">Subtotal (মোট পণ্যের মূল্য)</span>
                <span className="font-bold text-black">৳{subtotalForCalc}</span>
              </div>

              <div className="flex justify-between items-center text-black">
                <span className="font-medium text-slate-600">
                  Delivery Charge ({isInsideDhaka ? 'ঢাকার ভেতরে' : 'ঢাকার বাইরে'})
                </span>
                <span className="font-bold text-black">৳{deliveryCharge}</span>
              </div>

              {appliedPromo && (
                <div className="flex justify-between items-center text-emerald-600 font-bold">
                  <span>Voucher Discount ({appliedPromo.code})</span>
                  <span>-৳{appliedPromo.discount}</span>
                </div>
              )}

              <div className="border-t border-slate-200 pt-3 flex justify-between items-center text-black text-sm sm:text-base">
                <span className="font-bold text-slate-900">Total (সর্বমোট প্রদেয়)</span>
                <span className="font-black text-[#f85606] text-lg sm:text-xl">৳{payableTotal}</span>
              </div>
            </div>

            {/* Primary Action Button: "অর্ডার নিশ্চিত করুন ৳..." */}
            <button
              type="button"
              onClick={() => handleSubmit()}
              disabled={submitting}
              className="w-full py-3.5 bg-blue-600 hover:bg-blue-700 active:scale-[0.99] text-white font-bold text-sm sm:text-base rounded-xl shadow-lg transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
            >
              {submitting ? (
                <>
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>অর্ডার জমা হচ্ছে...</span>
                </>
              ) : (
                <>
                  <ShieldCheck className="w-5 h-5" />
                  <span>অর্ডার নিশ্চিত করুন ৳{payableTotal}</span>
                </>
              )}
            </button>

            {/* Trust Badges */}
            <div className="pt-2 border-t border-slate-100 space-y-2 text-[11px] text-slate-500 font-medium">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>১০০% আসল ও কোয়ালিটি পণ্য গ্যারান্টি</span>
              </div>
              <div className="flex items-center gap-2">
                <Truck className="w-4 h-4 text-blue-600 shrink-0" />
                <span>সারা বাংলাদেশে হোম ডেলিভারি ও ক্যাশ অন ডেলিভারি</span>
              </div>
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>৭ দিনের সহজ রিটার্ন পলিসি ও গ্রাহক সুরক্ষা</span>
              </div>
            </div>

          </div>

        </div>

      </div>

    </div>
  );
}
