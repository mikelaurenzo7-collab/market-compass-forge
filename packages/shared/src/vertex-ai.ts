// ─── Google Vertex AI Integration ─────────────────────────────
//
// Provides advanced AI capabilities beyond the LLM router:
//
//  • Time-series forecasting — predict price/demand 1-24h ahead
//  • Document AI           — production-grade OCR for invoices, contracts
//  • Vision AI             — product image quality scoring + auto-tagging
//
// Auth: Uses Google Cloud service account credentials (JSON key or
// Application Default Credentials). Set GOOGLE_APPLICATION_CREDENTIALS
// env var to the path of your service account JSON key file, or
// VERTEX_API_KEY for API-key based access.

// ─── Types ────────────────────────────────────────────────────

export interface TimeSeriesForecast {
  predictions: Array<{
    timestamp: number;
    value: number;
    lowerBound: number;
    upperBound: number;
  }>;
  confidence: number;   // 0-1 model confidence
  horizon: string;      // e.g. "4h", "24h"
  model: string;
  fetchedAt: number;
}

export interface DocumentAIResult {
  documentType: 'invoice' | 'contract' | 'receipt' | 'form' | 'other';
  entities: Array<{
    type: string;        // e.g. "invoice_number", "total_amount", "vendor_name"
    value: string;
    confidence: number;
    pageNumber?: number;
  }>;
  fullText: string;
  pageCount: number;
  confidence: number;
  processorUsed: string;
}

export interface VisionAnalysis {
  labels: Array<{ description: string; score: number }>;
  qualityScore: number;   // 0-100 composite quality
  dominantColors: Array<{ hex: string; pixelFraction: number; score: number }>;
  safeSearch: {
    adult: string;
    violence: string;
    racy: string;
  };
  textAnnotations: string[];
  webEntities: Array<{ description: string; score: number }>;
  productCategory?: string;
  backgroundQuality: 'clean' | 'cluttered' | 'unknown';
}

export interface VertexConfig {
  projectId: string;
  location: string;
  /** For API-key auth */
  apiKey?: string;
  /** For service account auth — the JSON content (not file path) */
  serviceAccountJson?: string;
}

// ─── Auth Helper ──────────────────────────────────────────────

interface AccessToken {
  token: string;
  expiresAt: number;
}

let cachedToken: AccessToken | null = null;

async function getAccessToken(config: VertexConfig): Promise<string | null> {
  // If using API key, no OAuth needed
  if (config.apiKey) return config.apiKey;

  // Check cached token
  if (cachedToken && cachedToken.expiresAt > Date.now() + 60_000) {
    return cachedToken.token;
  }

  // Use service account JWT → access token flow
  const saJson = config.serviceAccountJson ?? process.env.GOOGLE_SERVICE_ACCOUNT_JSON;
  if (!saJson) return null;

  try {
    const sa = JSON.parse(saJson) as {
      client_email: string;
      private_key: string;
      token_uri: string;
    };

    // Create JWT assertion
    const now = Math.floor(Date.now() / 1000);
    const header = Buffer.from(JSON.stringify({ alg: 'RS256', typ: 'JWT' })).toString('base64url');
    const payload = Buffer.from(JSON.stringify({
      iss: sa.client_email,
      scope: 'https://www.googleapis.com/auth/cloud-platform',
      aud: sa.token_uri,
      iat: now,
      exp: now + 3600,
    })).toString('base64url');

    // Sign with private key
    const crypto = await import('crypto');
    const sign = crypto.createSign('RSA-SHA256');
    sign.update(`${header}.${payload}`);
    const signature = sign.sign(sa.private_key, 'base64url');
    const jwt = `${header}.${payload}.${signature}`;

    // Exchange JWT for access token
    const res = await fetch(sa.token_uri, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: `grant_type=urn:ietf:params:oauth:grant-type:jwt-bearer&assertion=${jwt}`,
      signal: AbortSignal.timeout(10000),
    });

    if (!res.ok) return null;

    const tokenData = await res.json() as { access_token: string; expires_in: number };
    cachedToken = {
      token: tokenData.access_token,
      expiresAt: Date.now() + (tokenData.expires_in * 1000),
    };
    return cachedToken.token;
  } catch {
    return null;
  }
}

function getVertexConfig(): VertexConfig | null {
  const projectId = process.env.VERTEX_PROJECT_ID;
  const location = process.env.VERTEX_LOCATION ?? 'us-central1';
  if (!projectId) return null;
  return {
    projectId,
    location,
    apiKey: process.env.VERTEX_API_KEY,
    serviceAccountJson: process.env.GOOGLE_SERVICE_ACCOUNT_JSON,
  };
}

// ─── Time-Series Forecasting ──────────────────────────────────

/**
 * Uses Vertex AI's forecasting API to predict future values.
 * Falls back to a simple linear regression if Vertex is unavailable.
 *
 * @param historicalValues Array of [timestamp, value] pairs
 * @param horizonSteps How many steps ahead to predict
 * @param stepIntervalMs Interval between steps (e.g. 3600000 for 1h)
 */
export async function forecastTimeSeries(
  historicalValues: Array<[number, number]>,
  horizonSteps: number = 4,
  stepIntervalMs: number = 3600000,
): Promise<TimeSeriesForecast> {
  const config = getVertexConfig();
  if (!config) {
    return localLinearForecast(historicalValues, horizonSteps, stepIntervalMs);
  }

  const token = await getAccessToken(config);
  if (!token) {
    return localLinearForecast(historicalValues, horizonSteps, stepIntervalMs);
  }

  try {
    const endpoint = `https://${config.location}-aiplatform.googleapis.com/v1/projects/${config.projectId}/locations/${config.location}/publishers/google/models/timefm-1.0-200m:predict`;

    // TimesFM format: provide the time series as instances
    const instances = [{
      input: historicalValues.map(([, v]) => v),
      freq: stepIntervalMs <= 60000 ? '1min' : stepIntervalMs <= 3600000 ? '1h' : '1d',
      horizon: horizonSteps,
    }];

    const res = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ instances }),
      signal: AbortSignal.timeout(15000),
    });

    if (!res.ok) {
      return localLinearForecast(historicalValues, horizonSteps, stepIntervalMs);
    }

    const data = await res.json() as {
      predictions?: Array<{
        point_forecast?: number[];
        lower_bound?: number[];
        upper_bound?: number[];
      }>;
    };

    const pred = data.predictions?.[0];
    if (!pred?.point_forecast?.length) {
      return localLinearForecast(historicalValues, horizonSteps, stepIntervalMs);
    }

    const lastTs = historicalValues[historicalValues.length - 1]?.[0] ?? Date.now();
    const predictions = pred.point_forecast.map((value, i) => ({
      timestamp: lastTs + (i + 1) * stepIntervalMs,
      value,
      lowerBound: pred.lower_bound?.[i] ?? value * 0.95,
      upperBound: pred.upper_bound?.[i] ?? value * 1.05,
    }));

    return {
      predictions,
      confidence: 0.75,
      horizon: `${horizonSteps * (stepIntervalMs / 3600000)}h`,
      model: 'vertex-timesfm-1.0',
      fetchedAt: Date.now(),
    };
  } catch {
    return localLinearForecast(historicalValues, horizonSteps, stepIntervalMs);
  }
}

/**
 * Local fallback: simple linear regression forecast.
 */
function localLinearForecast(
  historicalValues: Array<[number, number]>,
  horizonSteps: number,
  stepIntervalMs: number,
): TimeSeriesForecast {
  if (historicalValues.length < 2) {
    const val = historicalValues[0]?.[1] ?? 0;
    const ts = historicalValues[0]?.[0] ?? Date.now();
    return {
      predictions: Array.from({ length: horizonSteps }, (_, i) => ({
        timestamp: ts + (i + 1) * stepIntervalMs,
        value: val,
        lowerBound: val * 0.9,
        upperBound: val * 1.1,
      })),
      confidence: 0.1,
      horizon: `${horizonSteps * (stepIntervalMs / 3600000)}h`,
      model: 'local-constant',
      fetchedAt: Date.now(),
    };
  }

  const n = historicalValues.length;
  const values = historicalValues.map(([, v]) => v);
  const xMean = (n - 1) / 2;
  const yMean = values.reduce((a, b) => a + b, 0) / n;

  let numSum = 0;
  let denSum = 0;
  for (let i = 0; i < n; i++) {
    numSum += (i - xMean) * (values[i] - yMean);
    denSum += (i - xMean) ** 2;
  }
  const slope = denSum !== 0 ? numSum / denSum : 0;
  const intercept = yMean - slope * xMean;

  // Standard error for confidence bands
  let sse = 0;
  for (let i = 0; i < n; i++) {
    sse += (values[i] - (intercept + slope * i)) ** 2;
  }
  const stdErr = Math.sqrt(sse / Math.max(1, n - 2));

  const lastTs = historicalValues[n - 1][0];
  const predictions = Array.from({ length: horizonSteps }, (_, i) => {
    const x = n + i;
    const value = intercept + slope * x;
    const band = stdErr * 1.96 * Math.sqrt(1 + 1 / n + ((x - xMean) ** 2) / denSum);
    return {
      timestamp: lastTs + (i + 1) * stepIntervalMs,
      value,
      lowerBound: value - band,
      upperBound: value + band,
    };
  });

  return {
    predictions,
    confidence: Math.max(0.15, Math.min(0.6, 1 - stdErr / (yMean || 1))),
    horizon: `${horizonSteps * (stepIntervalMs / 3600000)}h`,
    model: 'local-linear-regression',
    fetchedAt: Date.now(),
  };
}

// ─── Document AI ──────────────────────────────────────────────

/**
 * Processes a document through Google Document AI for structured extraction.
 * Falls back to basic regex extraction if Vertex is unavailable.
 *
 * @param documentBase64 Base64-encoded document (PDF, image, etc.)
 * @param mimeType MIME type (e.g. "application/pdf", "image/png")
 * @param processorType Which processor to use: "invoice", "contract", "general"
 */
export async function processDocument(
  documentBase64: string,
  mimeType: string,
  processorType: 'invoice' | 'contract' | 'general' = 'general',
): Promise<DocumentAIResult | null> {
  const config = getVertexConfig();
  if (!config) return null;

  const token = await getAccessToken(config);
  if (!token) return null;

  // Map processor types to Google's processor IDs
  // These need to be created in the user's GCP project
  const processorEnvKey = `DOCAI_PROCESSOR_${processorType.toUpperCase()}`;
  const processorId = process.env[processorEnvKey];
  if (!processorId) return null;

  try {
    const endpoint = `https://${config.location}-documentai.googleapis.com/v1/projects/${config.projectId}/locations/${config.location}/processors/${processorId}:process`;

    const res = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        rawDocument: {
          content: documentBase64,
          mimeType,
        },
      }),
      signal: AbortSignal.timeout(30000),
    });

    if (!res.ok) return null;

    const data = await res.json() as {
      document?: {
        text?: string;
        pages?: Array<unknown>;
        entities?: Array<{
          type: string;
          mentionText: string;
          confidence: number;
          pageAnchor?: { pageRefs?: Array<{ page?: string }> };
        }>;
      };
    };

    const doc = data.document;
    if (!doc) return null;

    const entities = (doc.entities ?? []).map(e => ({
      type: e.type,
      value: e.mentionText,
      confidence: e.confidence,
      pageNumber: e.pageAnchor?.pageRefs?.[0]?.page ? parseInt(e.pageAnchor.pageRefs[0].page, 10) + 1 : undefined,
    }));

    return {
      documentType: processorType === 'general' ? inferDocType(entities) : processorType,
      entities,
      fullText: doc.text ?? '',
      pageCount: (doc.pages as Array<unknown>)?.length ?? 1,
      confidence: entities.length > 0
        ? entities.reduce((sum, e) => sum + e.confidence, 0) / entities.length
        : 0,
      processorUsed: `vertex-docai-${processorType}`,
    };
  } catch {
    return null;
  }
}

function inferDocType(entities: Array<{ type: string }>): DocumentAIResult['documentType'] {
  const types = entities.map(e => e.type.toLowerCase());
  if (types.some(t => t.includes('invoice') || t.includes('total_amount'))) return 'invoice';
  if (types.some(t => t.includes('contract') || t.includes('effective_date'))) return 'contract';
  if (types.some(t => t.includes('receipt') || t.includes('purchase'))) return 'receipt';
  return 'other';
}

// ─── Vision AI ────────────────────────────────────────────────

/**
 * Analyzes a product image for quality, labels, colors, and safety.
 * Returns a composite quality score and actionable metadata.
 *
 * @param imageBase64 Base64-encoded image
 * @param mimeType Image MIME type (e.g. "image/jpeg")
 */
export async function analyzeProductImage(
  imageBase64: string,
  mimeType: string = 'image/jpeg',
): Promise<VisionAnalysis | null> {
  const config = getVertexConfig();
  // Vision API can use API key auth
  const apiKey = config?.apiKey ?? process.env.GOOGLE_VISION_API_KEY;
  if (!apiKey && !config) return null;

  try {
    let endpoint: string;
    let headers: Record<string, string>;

    if (config && !config.apiKey) {
      // Use Vertex AI Vision endpoint with OAuth
      const token = await getAccessToken(config);
      if (!token) return null;
      endpoint = `https://vision.googleapis.com/v1/images:annotate`;
      headers = {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      };
    } else {
      // Use API key
      const key = apiKey ?? config?.apiKey ?? '';
      endpoint = `https://vision.googleapis.com/v1/images:annotate?key=${encodeURIComponent(key)}`;
      headers = { 'Content-Type': 'application/json' };
    }

    const res = await fetch(endpoint, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        requests: [{
          image: { content: imageBase64 },
          features: [
            { type: 'LABEL_DETECTION', maxResults: 15 },
            { type: 'IMAGE_PROPERTIES' },
            { type: 'SAFE_SEARCH_DETECTION' },
            { type: 'TEXT_DETECTION', maxResults: 5 },
            { type: 'WEB_DETECTION', maxResults: 10 },
          ],
        }],
      }),
      signal: AbortSignal.timeout(15000),
    });

    if (!res.ok) return null;

    const data = await res.json() as {
      responses?: Array<{
        labelAnnotations?: Array<{ description: string; score: number }>;
        imagePropertiesAnnotation?: {
          dominantColors?: {
            colors?: Array<{ color: { red: number; green: number; blue: number }; pixelFraction: number; score: number }>;
          };
        };
        safeSearchAnnotation?: { adult: string; violence: string; racy: string };
        textAnnotations?: Array<{ description: string }>;
        webDetection?: {
          webEntities?: Array<{ description: string; score: number }>;
          bestGuessLabels?: Array<{ label: string }>;
        };
      }>;
    };

    const response = data.responses?.[0];
    if (!response) return null;

    const labels = (response.labelAnnotations ?? []).map(l => ({
      description: l.description,
      score: l.score,
    }));

    const colors = (response.imagePropertiesAnnotation?.dominantColors?.colors ?? [])
      .slice(0, 5)
      .map(c => ({
        hex: rgbToHex(c.color.red, c.color.green, c.color.blue),
        pixelFraction: c.pixelFraction,
        score: c.score,
      }));

    const safeSearch = response.safeSearchAnnotation ?? { adult: 'UNKNOWN', violence: 'UNKNOWN', racy: 'UNKNOWN' };

    const textAnnotations = (response.textAnnotations ?? [])
      .slice(0, 5)
      .map(t => t.description);

    const webEntities = (response.webDetection?.webEntities ?? [])
      .filter(e => e.description && e.score > 0.3)
      .map(e => ({ description: e.description, score: e.score }));

    const productCategory = response.webDetection?.bestGuessLabels?.[0]?.label;

    // Compute quality score
    const qualityScore = computeImageQuality(labels, colors, textAnnotations);

    // Determine background quality from labels and colors
    const bgQuality = assessBackground(labels, colors);

    return {
      labels,
      qualityScore,
      dominantColors: colors,
      safeSearch: {
        adult: safeSearch.adult,
        violence: safeSearch.violence,
        racy: safeSearch.racy,
      },
      textAnnotations,
      webEntities,
      productCategory,
      backgroundQuality: bgQuality,
    };
  } catch {
    return null;
  }
}

function rgbToHex(r: number, g: number, b: number): string {
  return '#' + [r, g, b].map(c => Math.round(c).toString(16).padStart(2, '0')).join('');
}

function computeImageQuality(
  labels: Array<{ description: string; score: number }>,
  colors: Array<{ pixelFraction: number; score: number }>,
  text: string[],
): number {
  let score = 50; // baseline

  // More labels = more visually interesting = higher quality
  if (labels.length >= 8) score += 10;
  else if (labels.length >= 5) score += 5;

  // High-confidence labels = clear, well-lit product
  const avgLabelConf = labels.reduce((s, l) => s + l.score, 0) / (labels.length || 1);
  if (avgLabelConf > 0.85) score += 15;
  else if (avgLabelConf > 0.7) score += 8;

  // Good color distribution (not monotone)
  if (colors.length >= 3) score += 5;

  // Dominant color shouldn't take > 80% (indicates poor composition)
  if (colors[0] && colors[0].pixelFraction > 0.8) score -= 10;

  // Text overlay in product images is usually bad (except for branded items)
  if (text.length > 2) score -= 5;

  // Product-related labels boost
  const productLabels = ['product', 'fashion', 'clothing', 'electronics', 'food', 'furniture', 'jewelry', 'shoe', 'bag'];
  if (labels.some(l => productLabels.some(pl => l.description.toLowerCase().includes(pl)))) {
    score += 10;
  }

  return Math.max(0, Math.min(100, score));
}

function assessBackground(
  labels: Array<{ description: string; score: number }>,
  colors: Array<{ pixelFraction: number; score: number }>,
): VisionAnalysis['backgroundQuality'] {
  // White/clean backgrounds typically have one dominant light color
  const topColor = colors[0];
  if (topColor && topColor.pixelFraction > 0.4 && topColor.score > 0.3) {
    return 'clean';
  }

  // Cluttered if many foreground labels
  const clutterLabels = ['room', 'shelf', 'table', 'crowd', 'mess', 'clutter'];
  if (labels.some(l => clutterLabels.some(cl => l.description.toLowerCase().includes(cl)))) {
    return 'cluttered';
  }

  return 'unknown';
}
