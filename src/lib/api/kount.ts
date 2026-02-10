import { KountConfigResponse, KountFraudCheckRequest, KountFraudCheckResponse } from "@/graphql/types/checkout";

export interface KountOrderUpdateRequest {
  kountOrderId: string;
  transactions: Array<{
    transactionId: string;
    paymentStatus: "AUTHORIZED" | "REFUSED";
    authorizationStatus: {
      authResult: "Approved" | "Declined";
      verificationResponse: {
        cvvStatus: "Match" | "Unknown";
        avsStatus: string;
      };
    };
    payment: {
      type: string;
      paymentToken: string;
      bin: string;
    };
  }>;
  [key: string]: unknown;
}

const KOUNT_BASE_URL = "https://kount.wsm-dev.com/api";

/* ----------------- HTTP helpers ----------------- */
async function httpGet<T>(path: string, headers?: Record<string, string>): Promise<T> {
  const url = `${KOUNT_BASE_URL}${path}`;
  
  let res: Response;
  try {
    res = await fetch(url, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        ...headers,
      },
      cache: "no-store", // Always fetch fresh config for security
    });
  } catch (e) {
    throw new Error(
      `GET ${url} network error: ${e instanceof Error ? e.message : String(e)}`
    );
  }

  if (!res.ok) {
    let msg = res.statusText;
    try {
      const j = (await res.json()) as { message?: string };
      msg = j?.message || msg;
    } catch {
      /* ignore */
    }
    throw new Error(`GET ${url} failed: ${res.status} ${msg}`);
  }
  return res.json() as Promise<T>;
}

async function httpPost<T>(path: string, body: Record<string, unknown>, headers?: Record<string, string>): Promise<T> {
  const url = `${KOUNT_BASE_URL}${path}`;
  
  let res: Response;
  try {
    res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...headers,
      },
      body: JSON.stringify(body),
      cache: "no-store",
    });
  } catch (e) {
    throw new Error(
      `POST ${url} network error: ${e instanceof Error ? e.message : String(e)}`
    );
  }

  if (!res.ok) {
    let msg = res.statusText;
    try {
      const j = (await res.json()) as { message?: string };
      msg = j?.message || msg;
    } catch {
      /* ignore */
    }
    throw new Error(`POST ${url} failed: ${res.status} ${msg}`);
  }
  return res.json() as Promise<T>;
}

async function httpPatch<T>(path: string, body: Record<string, unknown>, headers?: Record<string, string>): Promise<T> {
  const url = `${KOUNT_BASE_URL}${path}`;
  
  let res: Response;
  try {
    res = await fetch(url, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        ...headers,
      },
      body: JSON.stringify(body),
      cache: "no-store",
    });
  } catch (e) {
    throw new Error(
      `PATCH ${url} network error: ${e instanceof Error ? e.message : String(e)}`
    );
  }

  if (!res.ok) {
    let msg = res.statusText;
    try {
      const j = (await res.json()) as { message?: string };
      msg = j?.message || msg;
    } catch {
      /* ignore */
    }
    throw new Error(`PATCH ${url} failed: ${res.status} ${msg}`);
  }
  return res.json() as Promise<T>;
}

/* ----------------- Public API ----------------- */
export const kountApi = {
  async getKountConfig(): Promise<KountConfigResponse> {
    const saleorDomain = process.env.NEXT_PUBLIC_API_URL;
    if (!saleorDomain) {
      throw new Error("NEXT_PUBLIC_API_URL is not configured");
    }

    const headers = {
      "Saleor-Domain": saleorDomain,
    };

    return httpGet<KountConfigResponse>("/get-kount-config", headers);
  },

  async performFraudCheck(request: KountFraudCheckRequest): Promise<KountFraudCheckResponse> {
    const saleorDomain = process.env.NEXT_PUBLIC_API_URL;
    if (!saleorDomain) {
      throw new Error("NEXT_PUBLIC_API_URL is not configured");
    }

    const headers = {
      "Saleor-Domain": saleorDomain,
    };

    return httpPost<KountFraudCheckResponse>("/kount-fraud-check", request, headers);
  },

  async updateKountOrder(updateRequest: KountOrderUpdateRequest): Promise<Record<string, unknown>> {
    const saleorDomain = process.env.NEXT_PUBLIC_API_URL;
    if (!saleorDomain) {
      throw new Error("NEXT_PUBLIC_API_URL is not configured");
    }

    const headers = {
      "Saleor-Domain": saleorDomain,
    };

    return httpPatch("/kount-order-update", updateRequest, headers);
  },
};