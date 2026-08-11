import { afterEach, describe, expect, it, vi } from "vitest";

const TOKEN_URL = "https://test-store.myshopify.com/admin/oauth/access_token";

// restore the original fetch and clear env/module state between tests so each
// test can decide exactly how the Admin API is (or isn't) configured.
afterEach(() => {
  vi.restoreAllMocks();
  vi.resetModules();
  delete process.env.SHOPIFY_ADMIN_API_TOKEN;
  delete process.env.SHOPIFY_ADMIN_CLIENT_ID;
  delete process.env.SHOPIFY_ADMIN_CLIENT_SECRET;
});

function configureStaticToken(): void {
  process.env.SHOPIFY_ADMIN_API_TOKEN = "shpat_static_123";
  delete process.env.SHOPIFY_ADMIN_CLIENT_ID;
  delete process.env.SHOPIFY_ADMIN_CLIENT_SECRET;
}

function configureClientCredentials(): void {
  process.env.SHOPIFY_ADMIN_CLIENT_ID = "client-id-123";
  process.env.SHOPIFY_ADMIN_CLIENT_SECRET = "client-secret-456";
  delete process.env.SHOPIFY_ADMIN_API_TOKEN;
}

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

describe("getAdminAccessToken", () => {
  it("uses the static custom-app token without calling the token endpoint", async () => {
    configureStaticToken();
    vi.resetModules();
    const fetchSpy = vi.fn();
    vi.stubGlobal("fetch", fetchSpy);

    const { adminAuthSource, getAdminAccessToken } =
      await import("@/lib/shopify/admin-token");

    expect(adminAuthSource()).toBe("static-token");
    await expect(getAdminAccessToken()).resolves.toBe("shpat_static_123");
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("exchanges client credentials for a 24h token and caches it in-process", async () => {
    configureClientCredentials();
    vi.resetModules();
    const fetchSpy = vi.fn().mockResolvedValue(
      jsonResponse({
        access_token: "shpat_exchanged_789",
        scope: "read_products",
        expires_in: 86399,
      }),
    );
    vi.stubGlobal("fetch", fetchSpy);

    const { adminAuthSource, getAdminAccessToken } =
      await import("@/lib/shopify/admin-token");

    expect(adminAuthSource()).toBe("client-credentials");
    await expect(getAdminAccessToken()).resolves.toBe("shpat_exchanged_789");
    // Second call within the 24h window is served from cache.
    await expect(getAdminAccessToken()).resolves.toBe("shpat_exchanged_789");

    expect(fetchSpy).toHaveBeenCalledTimes(1);
    const [url, init] = fetchSpy.mock.calls[0]!;
    expect(url).toBe(TOKEN_URL);
    expect(init.method).toBe("POST");
    expect(init.headers["Content-Type"]).toBe(
      "application/x-www-form-urlencoded",
    );

    const body = new URLSearchParams(init.body as string);
    expect(body.get("grant_type")).toBe("client_credentials");
    expect(body.get("client_id")).toBe("client-id-123");
    expect(body.get("client_secret")).toBe("client-secret-456");
  });

  it("re-exchanges after the in-process cache is cleared", async () => {
    configureClientCredentials();
    vi.resetModules();
    // A fresh Response each call — a Response body can only be read once.
    const fetchSpy = vi.fn().mockImplementation(() =>
      Promise.resolve(
        jsonResponse({
          access_token: "shpat_exchanged_789",
          expires_in: 86399,
        }),
      ),
    );
    vi.stubGlobal("fetch", fetchSpy);

    const { getAdminAccessToken, resetAdminTokenCacheForTests } =
      await import("@/lib/shopify/admin-token");

    await getAdminAccessToken();
    resetAdminTokenCacheForTests();
    await expect(getAdminAccessToken()).resolves.toBe("shpat_exchanged_789");

    expect(fetchSpy).toHaveBeenCalledTimes(2);
  });

  it("prefers the static token when both auth paths are configured", async () => {
    configureStaticToken();
    process.env.SHOPIFY_ADMIN_CLIENT_ID = "client-id-123";
    process.env.SHOPIFY_ADMIN_CLIENT_SECRET = "client-secret-456";
    vi.resetModules();
    const fetchSpy = vi.fn();
    vi.stubGlobal("fetch", fetchSpy);

    const { adminAuthSource, getAdminAccessToken } =
      await import("@/lib/shopify/admin-token");

    expect(adminAuthSource()).toBe("static-token");
    await expect(getAdminAccessToken()).resolves.toBe("shpat_static_123");
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("throws a helpful error when the token endpoint rejects the exchange", async () => {
    configureClientCredentials();
    vi.resetModules();
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(jsonResponse({ error: "invalid_client" }, 401)),
    );

    const { getAdminAccessToken } = await import("@/lib/shopify/admin-token");

    await expect(getAdminAccessToken()).rejects.toThrow(
      "Shopify rejected the Admin client credentials exchange (401)",
    );
  });

  it("throws an actionable error when no Admin auth is configured", async () => {
    delete process.env.SHOPIFY_ADMIN_API_TOKEN;
    delete process.env.SHOPIFY_ADMIN_CLIENT_ID;
    delete process.env.SHOPIFY_ADMIN_CLIENT_SECRET;
    vi.resetModules();

    const { adminAuthSource, getAdminAccessToken } =
      await import("@/lib/shopify/admin-token");

    expect(adminAuthSource()).toBe("unconfigured");
    await expect(getAdminAccessToken()).rejects.toThrow(
      "Admin API is not configured",
    );
  });
});
