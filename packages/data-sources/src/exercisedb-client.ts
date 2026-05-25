/**
 * ExerciseDB API client supporting both the free OSS API and the paid V2 (RapidAPI) API.
 *
 * This client handles HTTP concerns only — no validation or transformation.
 * Use `@gym-app/transforms` to parse the raw data into domain types.
 */

export interface ExerciseDBClientConfig {
  /** Base URL for the API. Default: OSS endpoint. */
  baseUrl?: string;
  /** RapidAPI key — if present, V2 auth headers are added to every request. */
  apiKey?: string;
  /** RapidAPI host header. Default: 'exercisedb.p.rapidapi.com'. */
  apiHost?: string;
  /** Minimum milliseconds between consecutive paginated requests. Default: 200. */
  requestDelayMs?: number;
  /** Number of exercises per page. OSS max is 25. Default: 25. */
  pageSize?: number;
}

/** Shape returned by paginated endpoints. */
interface PaginatedResponse {
  success: boolean;
  meta: {
    total: number;
    hasNextPage: boolean;
    nextCursor?: string;
  };
  data: unknown[];
}

/** Shape returned by list endpoints (bodyparts, equipments, muscles). */
interface NameListResponse {
  success: boolean;
  data: Array<{ name: string }>;
}

// ---------------------------------------------------------------------------
// Response validators (runtime checks for untyped API responses)
// ---------------------------------------------------------------------------

function assertPaginatedResponse(data: unknown): asserts data is PaginatedResponse {
  if (
    !data || typeof data !== 'object' ||
    !('success' in data) || !('meta' in data) || !('data' in data) ||
    !Array.isArray((data as Record<string, unknown>).data)
  ) {
    throw new Error('[ExerciseDB] Invalid paginated response shape');
  }
}

function assertNameListResponse(data: unknown): asserts data is NameListResponse {
  if (
    !data || typeof data !== 'object' ||
    !('success' in data) || !('data' in data) ||
    !Array.isArray((data as Record<string, unknown>).data)
  ) {
    throw new Error('[ExerciseDB] Invalid name list response shape');
  }
}

interface SingleExerciseResponse {
  success: boolean;
  data: unknown;
}

function assertSingleExerciseResponse(data: unknown): asserts data is SingleExerciseResponse {
  if (
    !data || typeof data !== 'object' ||
    !('success' in data) || !('data' in data)
  ) {
    throw new Error('[ExerciseDB] Invalid single exercise response shape');
  }
}

const DEFAULT_BASE_URL = 'https://oss.exercisedb.dev';
const DEFAULT_API_HOST = 'exercisedb.p.rapidapi.com';
const DEFAULT_REQUEST_DELAY_MS = 200;
const DEFAULT_PAGE_SIZE = 25;
const RETRY_DELAY_MS = 2_000;
const API_PREFIX = '/api/v1';

export class ExerciseDBClient {
  private readonly baseUrl: string;
  private readonly apiKey: string | undefined;
  private readonly apiHost: string;
  private readonly requestDelayMs: number;
  private readonly pageSize: number;

  constructor(config: ExerciseDBClientConfig = {}) {
    this.baseUrl = (config.baseUrl ?? DEFAULT_BASE_URL).replace(/\/+$/, '');
    this.apiKey = config.apiKey;
    this.apiHost = config.apiHost ?? DEFAULT_API_HOST;
    this.requestDelayMs = config.requestDelayMs ?? DEFAULT_REQUEST_DELAY_MS;
    this.pageSize = config.pageSize ?? DEFAULT_PAGE_SIZE;
  }

  // ---------------------------------------------------------------------------
  // Public API
  // ---------------------------------------------------------------------------

  /**
   * Fetch ALL exercises with automatic cursor pagination.
   * Returns the complete catalog (~1,500 from OSS, ~11,000 from V2).
   * Logs progress every page.
   */
  async fetchAllExercises(): Promise<unknown[]> {
    const allExercises: unknown[] = [];
    let cursor: string | undefined;
    let total: number | undefined;

    // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition, no-constant-condition
    while (true) {
      const url = this.buildUrl('/exercises', {
        limit: String(this.pageSize),
        ...(cursor ? { after: cursor } : {}),
      });

      const response = await this.request(url);
      assertPaginatedResponse(response);
      const { data, meta } = response;

      if (total === undefined) {
        total = meta.total;
      }

      allExercises.push(...data);

      console.log(
        `[ExerciseDB] Fetched ${String(allExercises.length)}/${String(total)} exercises...`,
      );

      if (!meta.hasNextPage) {
        break;
      }

      cursor = meta.nextCursor;

      if (!cursor) {
        console.warn('[ExerciseDB] hasNextPage=true but no nextCursor — stopping pagination.');
        break;
      }

      await this.delay(this.requestDelayMs);
    }

    console.log(
      `[ExerciseDB] Done. Total exercises fetched: ${String(allExercises.length)}`,
    );

    return allExercises;
  }

  /** Fetch a single exercise by ID. */
  async fetchExerciseById(exerciseId: string): Promise<unknown> {
    const url = this.buildUrl(`/exercises/${encodeURIComponent(exerciseId)}`);
    const response = await this.request(url);
    assertSingleExerciseResponse(response);
    return response.data;
  }

  /** Fetch list of body part names. */
  async fetchBodyParts(): Promise<string[]> {
    return this.fetchNameList('/bodyparts');
  }

  /** Fetch list of equipment names. */
  async fetchEquipmentList(): Promise<string[]> {
    return this.fetchNameList('/equipments');
  }

  /** Fetch list of muscle names. */
  async fetchMuscleList(): Promise<string[]> {
    return this.fetchNameList('/muscles');
  }

  // ---------------------------------------------------------------------------
  // Internals
  // ---------------------------------------------------------------------------

  private async fetchNameList(path: string): Promise<string[]> {
    const url = this.buildUrl(path);
    const response = await this.request(url);
    assertNameListResponse(response);
    return response.data.map((item) => item.name);
  }

  private buildUrl(
    path: string,
    params?: Record<string, string>,
  ): string {
    const url = new URL(`${API_PREFIX}${path}`, this.baseUrl);
    if (params) {
      for (const [key, value] of Object.entries(params)) {
        url.searchParams.set(key, value);
      }
    }
    return url.toString();
  }

  private buildHeaders(): Record<string, string> {
    const headers: Record<string, string> = {
      'Accept': 'application/json',
    };

    if (this.apiKey) {
      headers['X-RapidAPI-Key'] = this.apiKey;
      headers['X-RapidAPI-Host'] = this.apiHost;
    }

    return headers;
  }

  /**
   * Execute a fetch with error handling and a single retry on 429.
   */
  private async request(url: string, isRetry = false): Promise<unknown> {
    let response: Response;

    try {
      response = await fetch(url, { headers: this.buildHeaders() });
    } catch (error: unknown) {
      const message =
        error instanceof Error ? error.message : 'Unknown network error';
      throw new Error(`[ExerciseDB] Network error: ${message}`);
    }

    // 429 — rate limited: wait and retry once
    if (response.status === 429) {
      if (isRetry) {
        throw new Error(
          `[ExerciseDB] Rate limited (429) on retry. URL: ${url}`,
        );
      }
      console.warn(
        `[ExerciseDB] Rate limited (429). Waiting ${String(RETRY_DELAY_MS)}ms before retry...`,
      );
      await this.delay(RETRY_DELAY_MS);
      return this.request(url, true);
    }

    // 401 / 403 — auth failure
    if (response.status === 401 || response.status === 403) {
      throw new Error(
        `[ExerciseDB] Invalid API key or unauthorized (${String(response.status)}). ` +
          'Check your apiKey and apiHost configuration.',
      );
    }

    // Other non-2xx
    if (!response.ok) {
      const body = await response.text().catch(() => '<unreadable body>');
      throw new Error(
        `[ExerciseDB] HTTP ${String(response.status)}: ${body}`,
      );
    }

    return response.json() as Promise<unknown>;
  }

  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => {
      setTimeout(resolve, ms);
    });
  }
}
