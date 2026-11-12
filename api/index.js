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

    const cookieHeader = `.ROBLOSECURITY=${cookie}`;

    // Ambil X-CSRF-Token dari Roblox
    const csrfResp = await fetch("https://auth.roblox.com/v1/logout", {
      method: "POST",
      headers: { "Cookie": cookieHeader },
    });

    let csrfToken = csrfResp.headers.get("x-csrf-token");

    if (!csrfToken) {
      const tokenResp = await fetch("https://develop.roblox.com/v1/universes/create", {
        method: "POST",
        headers: { "Cookie": cookieHeader },
      });
      csrfToken = tokenResp.headers.get("x-csrf-token");
    }

    if (!csrfToken) {
      response.setHeader("Access-Control-Allow-Origin", "*");
      return response.status(401).json({ ok: false, message: "Failed to get CSRF Token. Cookie might be invalid." });
    }

    let robloxResp;
    let responseData;

    response.setHeader("Access-Control-Allow-Origin", "*");

    if (action === "createUniverse") {
      robloxResp = await fetch("https://develop.roblox.com/v1/universes/create", {
        method: "POST",
        headers: {
          "Cookie": cookieHeader,
          "X-CSRF-TOKEN": csrfToken,
          "Content-Type": "application/json",
        },
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
        headers: {
          "Cookie": cookieHeader,
          "X-CSRF-TOKEN": csrfToken,
          "Content-Type": "application/json",
        },
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
