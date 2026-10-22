/**
 * Camada de integração isolada com a ExerciseDB V1 API (versão gratuita).
 *
 * Documentação oficial: https://oss.exercisedb.dev/docs
 * Especificação: OpenAPI 3.1.0 | API v1.0.0
 * Base: https://oss.exercisedb.dev
 *
 * Endpoints efetivamente utilizados (conforme a especificação oficial):
 *  - GET /api/v1/exercises             → listagem com filtros e paginação por cursor
 *  - GET /api/v1/exercises/{id}        → detalhe do exercício por ID
 *  - GET /api/v1/bodyparts             → lista de partes do corpo
 *  - GET /api/v1/muscles               → lista de músculos
 *  - GET /api/v1/equipments            → lista de equipamentos
 *
 * A versão gratuita NÃO exige API key.
 *
 * Nenhuma outra versão/rota da ExerciseDB é utilizada aqui.
 */

export const EXERCISEDB_BASE_URL = "https://oss.exercisedb.dev";

const API_PATH = "/api/v1";
const REQUEST_TIMEOUT_MS = 8000;
/** Cache do Next.js para listagens/detalhes (segundos). */
const DATA_REVALIDATE_SECONDS = 300;
/** Cache do Next.js para listas de opções (praticamente estáticas). */
const OPTIONS_REVALIDATE_SECONDS = 86400;

/** Limite máximo aceito pela API para o parâmetro `limit`. */
export const EXERCISEDB_MAX_LIMIT = 25;

export interface ExerciseDbExercise {
  exerciseId: string;
  name: string;
  gifUrl: string | null;
  bodyParts: string[];
  equipments: string[];
  targetMuscles: string[];
  secondaryMuscles: string[];
  instructions: string[];
}

export interface ExerciseDbOption {
  name: string;
}

export interface ExerciseDbPage {
  items: ExerciseDbExercise[];
  total: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
  nextCursor: string | null;
  previousCursor: string | null;
}

export type ExerciseDbErrorCode =
  | "invalid_request"
  | "not_found"
  | "rate_limited"
  | "timeout"
  | "unavailable"
  | "invalid_response";

export type ExerciseDbResult<T> =
  | { ok: true; data: T }
  | { ok: false; code: ExerciseDbErrorCode; status?: number };

export interface ExerciseDbListParams {
  /** Filtro por nome (a API aplica correspondência aproximada). */
  name?: string;
  /** Partes do corpo separadas por vírgula. */
  bodyParts?: string;
  /** Músculos-alvo separados por vírgula. */
  targetMuscles?: string;
  /** Músculos secundários separados por vírgula. */
  secondaryMuscles?: string;
  /** Equipamentos separados por vírgula. */
  equipments?: string;
  /** Quantidade de itens (1 a 25). Default: 10 na API. */
  limit?: number;
  /** ID do exercício a partir do qual paginar para frente. */
  after?: string;
  /** ID do exercício a partir do qual paginar para trás. */
  before?: string;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function cleanString(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function toStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  const seen = new Set<string>();
  const result: string[] = [];
  for (const item of value) {
    const text = cleanString(item);
    if (!text) continue;
    const key = text.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    result.push(text);
  }
  return result;
}

/** Aceita apenas URLs absolutas https válidas. Retorna null quando inválida. */
function normalizeMediaUrl(value: unknown): string | null {
  const raw = cleanString(value);
  if (!raw) return null;
  try {
    const url = new URL(raw);
    if (url.protocol !== "https:") return null;
    return url.toString();
  } catch {
    return null;
  }
}

const STEP_PREFIX = /^step\s*[:.]?\s*(\d+)\s*[:.)-]?\s*/i;

/**
 * A API retorna as instruções como uma lista no formato "Step:N ...".
 * Aqui removemos o prefixo, ordenamos pelo número do passo e descartamos vazios.
 */
function normalizeInstructions(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  const parsed: Array<{ order: number; text: string }> = [];
  value.forEach((item, index) => {
    const text = cleanString(item);
    if (!text) return;
    const match = STEP_PREFIX.exec(text);
    const order = match ? Number(match[1]) : index + 1;
    const body = text.replace(STEP_PREFIX, "").trim();
    if (!body) return;
    parsed.push({ order: Number.isFinite(order) ? order : index + 1, text: body });
  });
  parsed.sort((a, b) => a.order - b.order);
  return parsed.map((item) => item.text);
}

function normalizeExercise(value: unknown): ExerciseDbExercise | null {
  if (!isRecord(value)) return null;
  const exerciseId = cleanString(value.exerciseId);
  if (!exerciseId) return null;
  return {
    exerciseId,
    name: cleanString(value.name),
    gifUrl: normalizeMediaUrl(value.gifUrl),
    bodyParts: toStringArray(value.bodyParts),
    equipments: toStringArray(value.equipments),
    targetMuscles: toStringArray(value.targetMuscles),
    secondaryMuscles: toStringArray(value.secondaryMuscles),
    instructions: normalizeInstructions(value.instructions),
  };
}

function normalizeOptions(value: unknown): ExerciseDbOption[] {
  if (!Array.isArray(value)) return [];
  const seen = new Set<string>();
  const options: ExerciseDbOption[] = [];
  for (const item of value) {
    const name = isRecord(item) ? cleanString(item.name) : cleanString(item);
    if (!name) continue;
    const key = name.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    options.push({ name });
  }
  return options;
}

function buildUrl(
  path: string,
  params?: Record<string, string | number | undefined | null>
): string {
  const url = new URL(`${EXERCISEDB_BASE_URL}${API_PATH}${path}`);
  if (params) {
    for (const [key, value] of Object.entries(params)) {
      if (value === undefined || value === null) continue;
      const normalized = String(value).trim();
      if (!normalized) continue;
      url.searchParams.set(key, normalized);
    }
  }
  return url.toString();
}

async function requestJson(
  path: string,
  params: Record<string, string | number | undefined | null> | undefined,
  revalidate: number
): Promise<ExerciseDbResult<Record<string, unknown>>> {
  try {
    const response = await fetch(buildUrl(path, params), {
      headers: { accept: "application/json" },
      next: { revalidate },
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    });

    if (response.status === 429) {
      return { ok: false, code: "rate_limited", status: 429 };
    }
    if (response.status === 404) {
      return { ok: false, code: "not_found", status: 404 };
    }
    if (!response.ok) {
      return { ok: false, code: "unavailable", status: response.status };
    }

    const payload: unknown = await response.json();
    if (!isRecord(payload) || payload.success !== true) {
      return { ok: false, code: "invalid_response", status: response.status };
    }
    return { ok: true, data: payload };
  } catch (error) {
    if (error instanceof Error && (error.name === "TimeoutError" || error.name === "AbortError")) {
      return { ok: false, code: "timeout" };
    }
    return { ok: false, code: "unavailable" };
  }
}

function normalizePage(payload: Record<string, unknown>): ExerciseDbPage {
  const items = Array.isArray(payload.data)
    ? payload.data
        .map(normalizeExercise)
        .filter((item): item is ExerciseDbExercise => item !== null)
    : [];

  const meta = isRecord(payload.meta) ? payload.meta : {};
  const numberOr = (value: unknown, fallback: number) =>
    typeof value === "number" && Number.isFinite(value) ? value : fallback;

  return {
    items,
    total: numberOr(meta.total, items.length),
    hasNextPage: meta.hasNextPage === true,
    hasPreviousPage: meta.hasPreviousPage === true,
    nextCursor: cleanString(meta.nextCursor) || null,
    previousCursor: cleanString(meta.previousCursor) || null,
  };
}

/**
 * Lista exercícios com filtros e paginação por cursor.
 * GET /api/v1/exercises
 */
export async function listExercises(
  params: ExerciseDbListParams = {}
): Promise<ExerciseDbResult<ExerciseDbPage>> {
  const limit =
    typeof params.limit === "number" && Number.isFinite(params.limit)
      ? Math.min(Math.max(Math.trunc(params.limit), 1), EXERCISEDB_MAX_LIMIT)
      : 10;

  const result = await requestJson(
    "/exercises",
    {
      name: params.name,
      bodyParts: params.bodyParts,
      targetMuscles: params.targetMuscles,
      secondaryMuscles: params.secondaryMuscles,
      equipments: params.equipments,
      limit,
      after: params.after,
      before: params.before,
    },
    DATA_REVALIDATE_SECONDS
  );

  if (!result.ok) return result;
  return { ok: true, data: normalizePage(result.data) };
}

/**
 * Busca os dados completos de um exercício pelo ID.
 * GET /api/v1/exercises/{exerciseId}
 */
export async function getExercise(
  exerciseId: string
): Promise<ExerciseDbResult<ExerciseDbExercise>> {
  const id = cleanString(exerciseId);
  if (!id) return { ok: false, code: "invalid_request" };

  const result = await requestJson(
    `/exercises/${encodeURIComponent(id)}`,
    undefined,
    DATA_REVALIDATE_SECONDS
  );

  if (!result.ok) return result;

  const exercise = normalizeExercise(result.data.data);
  if (!exercise) return { ok: false, code: "invalid_response" };
  return { ok: true, data: exercise };
}

async function listOptions(
  path: "/bodyparts" | "/muscles" | "/equipments"
): Promise<ExerciseDbResult<ExerciseDbOption[]>> {
  const result = await requestJson(path, undefined, OPTIONS_REVALIDATE_SECONDS);
  if (!result.ok) return result;
  return { ok: true, data: normalizeOptions(result.data.data) };
}

/** GET /api/v1/bodyparts */
export async function listBodyParts(): Promise<ExerciseDbResult<ExerciseDbOption[]>> {
  return listOptions("/bodyparts");
}

/** GET /api/v1/muscles */
export async function listMuscles(): Promise<ExerciseDbResult<ExerciseDbOption[]>> {
  return listOptions("/muscles");
}

/** GET /api/v1/equipments */
export async function listEquipments(): Promise<ExerciseDbResult<ExerciseDbOption[]>> {
  return listOptions("/equipments");
}
