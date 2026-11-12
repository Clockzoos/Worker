export default async function handler(request, response) {
  // 1. Tangani CORS preflight request
  if (request.method === "OPTIONS") {
    response.setHeader("Access-Control-Allow-Origin", "*");
    response.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
    response.setHeader("Access-Control-Allow-Headers", "Content-Type");
    return response.status(200).end();
  }

  // 2. Pastikan hanya menerima method POST
  if (request.method !== "POST") {
    response.setHeader("Access-Control-Allow-Origin", "*");
    return response.status(405).json({ ok: false, message: "Method not allowed" });
  }

  try {
    const { action, cookie, universeId, templateId } = request.body;

    if (!cookie) {
      response.setHeader("Access-Control-Allow-Origin", "*");
      return response.status(400).json({ ok: false, message: "Cookie is missing." });
    }

    // Bersihkan cookie dari awalan .ROBLOSECURITY= kalau ada
    let cleanCookie = cookie.trim();
    if (cleanCookie.startsWith(".ROBLOSECURITY=")) {
      cleanCookie = cleanCookie.replace(".ROBLOSECURITY=", "");
    }

    const cookieHeader = `.ROBLOSECURITY=${cleanCookie}`;

    // Header tambahan agar request tidak dideteksi bot oleh Roblox
    const robloxHeaders = {
      "Cookie": cookieHeader,
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      "Referer": "https://www.roblox.com/",
      "Content-Type": "application/json"
    };

    // Ambil X-CSRF-Token dari Roblox
    const csrfResp = await fetch("https://auth.roblox.com/v1/logout", {
      method: "POST",
      headers: robloxHeaders,
    });

    let csrfToken = csrfResp.headers.get("x-csrf-token");

    if (!csrfToken) {
      const tokenResp = await fetch("https://develop.roblox.com/v1/universes/create", {
        method: "POST",
        headers: robloxHeaders,
      });
      csrfToken = tokenResp.headers.get("x-csrf-token");
    }

    if (!csrfToken) {
      response.setHeader("Access-Control-Allow-Origin", "*");
      return response.status(401).json({ ok: false, message: "Failed to get CSRF Token. Cookie might be invalid or blocked." });
    }

    // Masukkan token ke header khusus request utama
    const actionHeaders = {
      ...robloxHeaders,
      "X-CSRF-TOKEN": csrfToken
    };

    let robloxResp;
    let responseData;

    response.setHeader("Access-Control-Allow-Origin", "*");

    if (action === "createUniverse") {
      robloxResp = await fetch("https://develop.roblox.com/v1/universes/create", {
        method: "POST",
        headers: actionHeaders,
        body: JSON.stringify({
          templatePlaceId: templateId || 95206881,
        }),
      });

      if (robloxResp.ok) {
        responseData = await robloxResp.json();
        return response.status(200).json({ 
          ok: true, 
          message: `Universe created successfully! ID: ${responseData.universeId || responseData.rootPlaceId || 'OK'}` 
        });
      } else {
        const errText = await robloxResp.text();
        return response.status(200).json({ ok: false, message: `Roblox API Error: ${errText || robloxResp.statusText}` });
      }

    } else if (action === "createPlace") {
      if (!universeId) {
        return response.status(400).json({ ok: false, message: "Universe ID is required for creating a place." });
      }

      robloxResp = await fetch(`https://develop.roblox.com/v1/universes/${universeId}/places`, {
        method: "POST",
        headers: actionHeaders,
        body: JSON.stringify({
          templateId: templateId || 95206881,
          name: "Created Place",
        }),
      });

      if (robloxResp.ok) {
        responseData = await robloxResp.json();
        return response.status(200).json({ 
          ok: true, 
          message: `Place created successfully! ID: ${responseData.placeId || 'OK'}` 
        });
      } else {
        const errText = await robloxResp.text();
        return response.status(200).json({ ok: false, message: `Roblox API Error: ${errText || robloxResp.statusText}` });
      }

    } else {
      return response.status(400).json({ ok: false, message: "Unknown action." });
    }

  } catch (err) {
    response.setHeader("Access-Control-Allow-Origin", "*");
    return response.status(500).json({ ok: false, message: "Server internal error: " + err.message });
  }
}
