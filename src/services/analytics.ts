/**
 * Analytics tracking service for Anemoia.
 * Sends anonymous page-view and tool-usage events to the backend.
 */

const API_BASE =
  import.meta.env.VITE_API_URL?.replace(/\/api\/?$/, '') ||
  (window.location.hostname === 'localhost'
    ? 'http://localhost:8000'
    : 'https://anemoia-api.onrender.com');

// ── Visitor fingerprint (stable per browser, no PII) ──
function getVisitorId(): string {
  let id = localStorage.getItem('anemo_vid');
  if (!id) {
    id = crypto.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
    localStorage.setItem('anemo_vid', id);
  }
  return id;
}

function getSessionId(): string {
  let id = sessionStorage.getItem('anemo_sid');
  if (!id) {
    id = crypto.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
    sessionStorage.setItem('anemo_sid', id);
  }
  return id;
}

// ── Device detection ──
function getDeviceType(): 'desktop' | 'mobile' | 'tablet' {
  const ua = navigator.userAgent.toLowerCase();
  if (/ipad|tablet|playbook|silk/i.test(ua) || (ua.includes('android') && !ua.includes('mobile'))) {
    return 'tablet';
  }
  if (/iphone|ipod|android.*mobile|windows phone|blackberry|bb10|opera mini|iemobile/i.test(ua)) {
    return 'mobile';
  }
  return 'desktop';
}

function getBrowser(): string {
  const ua = navigator.userAgent;
  if (ua.includes('Firefox/')) return 'Firefox';
  if (ua.includes('Edg/')) return 'Edge';
  if (ua.includes('OPR/') || ua.includes('Opera')) return 'Opera';
  if (ua.includes('Brave')) return 'Brave';
  if (ua.includes('Chrome/') && ua.includes('Safari/')) return 'Chrome';
  if (ua.includes('Safari/') && !ua.includes('Chrome')) return 'Safari';
  if (ua.includes('MSIE') || ua.includes('Trident')) return 'IE';
  return 'Other';
}

function getOS(): string {
  const ua = navigator.userAgent;
  if (ua.includes('Win')) return 'Windows';
  if (ua.includes('Mac')) return 'macOS';
  if (ua.includes('Linux') && ua.includes('Android')) return 'Android';
  if (ua.includes('Linux')) return 'Linux';
  if (ua.includes('iPhone') || ua.includes('iPad')) return 'iOS';
  if (ua.includes('CrOS')) return 'ChromeOS';
  return 'Other';
}

// ── UTM params ──
function getUtmParams() {
  const params = new URLSearchParams(window.location.search);
  return {
    utm_source: params.get('utm_source') || undefined,
    utm_medium: params.get('utm_medium') || undefined,
    utm_campaign: params.get('utm_campaign') || undefined,
  };
}

// ── Tool name mapping (mirrors backend) ──
const TOOL_ROUTES: Record<string, string> = {
  '/depth-map': '3D Depth Mapping',
  '/pose-estimation': 'Pose Estimation',
  '/upscaler': 'AI Upscaling',
  '/sharp': 'SHARP 3D Generator',
  '/splat-viewer': '3D Splat Viewer',
  '/compare': 'Image Comparison',
  '/subtitle': 'Video Caption Studio',
  '/face-swap': 'Face Swap AI',
  '/ascii-video-converter': 'ASCII Video Converter',
  '/image-chat': 'Gemini Image Chat',
  '/triangle-splatting': 'Triangle Splatting',
  '/doom': 'DOOM',
  '/anime-gallery': 'Anime Gallery',
  '/synthid-remover': 'SynthID Remover',
  '/video-object-remover': 'Video Object Remover',
};

function getToolName(path: string): string | undefined {
  for (const [route, name] of Object.entries(TOOL_ROUTES)) {
    if (path.startsWith(route)) return name;
  }
  return undefined;
}

// ── Track event ──
let _lastTrackedPath = '';
let _pageEnterTime = Date.now();

export async function trackPageView(path: string, userEmail?: string | null) {
  // Debounce duplicate calls for the same path
  if (path === _lastTrackedPath) return;

  // Calculate duration on previous page
  const durationSeconds = _lastTrackedPath ? (Date.now() - _pageEnterTime) / 1000 : undefined;

  _lastTrackedPath = path;
  _pageEnterTime = Date.now();

  const utm = getUtmParams();
  const toolName = getToolName(path);

  const payload: Record<string, unknown> = {
    page_path: path,
    tool_name: toolName,
    visitor_id: getVisitorId(),
    session_id: getSessionId(),
    user_email: userEmail || undefined,
    device_type: getDeviceType(),
    browser: getBrowser(),
    os: getOS(),
    screen_width: window.screen.width,
    screen_height: window.screen.height,
    referrer: document.referrer || undefined,
    ...utm,
    duration_seconds: durationSeconds,
  };

  // Fire-and-forget
  try {
    await fetch(`${API_BASE}/api/analytics/track`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
  } catch {
    // Silently fail – analytics should never break the app
  }
}

// ── Dashboard data fetcher ──
export interface AnalyticsDashboardData {
  period: string;
  start_date: string;
  summary: {
    total_events: number;
    unique_visitors: number;
    total_page_views: number;
    total_tool_uses: number;
  };
  daily_visitors: { date: string; visitors: number; events: number }[];
  tool_usage: { tool: string; count: number; unique_users: number }[];
  device_breakdown: { device: string; count: number }[];
  browser_breakdown: { browser: string; count: number }[];
  os_breakdown: { os: string; count: number }[];
  country_breakdown: { country: string; country_code: string; count: number; unique_visitors: number }[];
  top_pages: { page: string; count: number; unique_visitors: number }[];
  top_referrers: { referrer: string; count: number }[];
  recent_events: {
    id: number;
    event_type: string;
    page_path: string;
    tool_name: string | null;
    device_type: string | null;
    browser: string | null;
    os: string | null;
    country: string | null;
    city: string | null;
    referrer: string | null;
    created_at: string | null;
  }[];
}

export async function fetchDashboardData(
  adminEmail: string,
  period: string = '30d',
): Promise<AnalyticsDashboardData> {
  const resp = await fetch(
    `${API_BASE}/api/analytics/dashboard?admin_email=${encodeURIComponent(adminEmail)}&period=${period}`,
  );
  if (!resp.ok) {
    throw new Error(`Dashboard API returned ${resp.status}: ${await resp.text()}`);
  }
  return resp.json();
}

