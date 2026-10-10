// Meta Pixel & Conversions API (CAPI) Client SDK for BazaarPulse
// Enforces canonical event_id deduplication and secure event tracking

declare global {
  interface Window {
    fbq?: (...args: any[]) => void;
    _fbq?: any;
  }
}

export function generateCanonicalEventId(eventName: string): string {
  const timestamp = Date.now();
  const randomHex = Math.random().toString(16).substring(2, 10);
  return `bp_${eventName.toLowerCase()}_${timestamp}_${randomHex}`;
}

export interface TrackEventOptions {
  eventName: 'PageView' | 'ViewContent' | 'AddToCart' | 'InitiateCheckout' | 'Purchase' | string;
  customData?: {
    content_ids?: string[];
    content_type?: string;
    value?: number;
    currency?: string;
    order_id?: string;
    num_items?: number;
    [key: string]: any;
  };
  userData?: {
    email?: string;
    phone?: string;
    firstName?: string;
    lastName?: string;
    [key: string]: any;
  };
  eventId?: string;
}

export async function trackMetaEvent({ eventName, customData = {}, userData = {}, eventId }: TrackEventOptions): Promise<string> {
  const canonicalEventId = eventId || generateCanonicalEventId(eventName);
  const currency = customData.currency || 'BDT';

  // 1. Trigger Client-Side Meta Pixel if initialized
  try {
    const fbqFn = window.fbq as any;
    if (typeof window !== 'undefined' && typeof fbqFn === 'function') {
      const payload: any = { ...customData, currency };
      fbqFn('track', eventName, payload, { eventID: canonicalEventId });
      console.log(`[Meta Pixel] Tracked ${eventName} (Event ID: ${canonicalEventId})`, payload);
    }
  } catch (pixelErr) {
    console.warn('[Meta Pixel] Browser pixel dispatch note:', pixelErr);
  }

  // 2. Trigger Server-Side Meta CAPI endpoint for robust deduplication & attribution
  try {
    const token = localStorage.getItem('bazaarpulse_token') || localStorage.getItem('bazaarpulse_admin_token') || '';
    await fetch('/api/v1/tracking/event', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { 'Authorization': `Bearer ${token}` } : {})
      },
      body: JSON.stringify({
        event_name: eventName,
        event_id: canonicalEventId,
        event_source_url: window.location.href,
        custom_data: {
          ...customData,
          currency
        },
        user_data: {
          email: userData.email || localStorage.getItem('bazaarpulse_user_email') || undefined,
          phone: userData.phone || localStorage.getItem('bazaarpulse_user_phone') || undefined,
          first_name: userData.firstName,
          last_name: userData.lastName
        }
      })
    });
  } catch (capiErr) {
    console.warn('[Meta CAPI] Server ingestion relay note:', capiErr);
  }

  return canonicalEventId;
}

// Helper to inject Meta Pixel base script dynamically if Pixel ID is configured
export function initializeMetaPixel(pixelId: string) {
  if (!pixelId || typeof window === 'undefined') return;
  if (window.fbq) return; // Already initialized

  try {
    /* eslint-disable */
    (function(f: any, b: any, e: any, v: any, n?: any, t?: any, s?: any) {
      if (f.fbq) return; n = f.fbq = function() {
        n.callMethod ? n.callMethod.apply(n, arguments) : n.queue.push(arguments)
      };
      if (!f._fbq) f._fbq = n; n.push = n; n.loaded = !0; n.version = '2.0';
      n.queue = []; t = b.createElement(e); t.async = !0;
      t.src = v; s = b.getElementsByTagName(e)[0];
      if (s && s.parentNode) {
        s.parentNode.insertBefore(t, s);
      }
    })(window, document, 'script', 'https://connect.facebook.net/en_US/fbevents.js');
    /* eslint-enable */

    const fbqFn = window.fbq as any;
    if (typeof fbqFn === 'function') {
      fbqFn('init', pixelId);
      fbqFn('track', 'PageView');
    }
    console.log(`[Meta Pixel] Initialized successfully with Pixel ID: ${pixelId}`);
  } catch (initErr) {
    console.error('[Meta Pixel] Initialization error:', initErr);
  }
}
