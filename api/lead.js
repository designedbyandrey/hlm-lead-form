// api/lead.js

const SOLLIT_API_URL = "https://app.sollit.com/api/person";

module.exports = async (req, res) => {
  // CORS voor Webflow
  res.setHeader("Access-Control-Allow-Origin", "*"); // vervang * later evt. door jouw Webflow domein
  res.setHeader("Access-Control-Allow-Methods", "POST,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  // Preflight request
  if (req.method === "OPTIONS") {
    res.statusCode = 200;
    return res.end();
  }

  // Alleen POST toestaan
  if (req.method !== "POST") {
    res.statusCode = 405;
    return res.json({ message: "Method not allowed" });
  }

  const apiKey = process.env.sollit_api_key;

  if (!apiKey) {
    console.error("Missing sollit_api_key env variable");
    res.statusCode = 500;
    return res.json({ message: "Server config error" });
  }

  // Body kan string of object zijn
  let body = req.body || {};
  if (typeof body === "string") {
    try {
      body = JSON.parse(body);
    } catch (e) {
      res.statusCode = 400;
      return res.json({ message: "Invalid JSON body" });
    }
  }

  const {
    postcode,
    number,
    first_name,
    last_name,
    jaarlijks_verbruik,
    product_type
  } = body;

  // Basic checks
  if (!postcode || !number || !first_name || !last_name) {
    res.statusCode = 400;
    return res.json({ message: "Vereiste velden ontbreken" });
  }

  const sollitPayload = {
    skip_postcode_check: true,
    match_person_on_address: false,
    postcode,
    number,
    first_name,
    last_name,
    jaarlijks_verbruik: Number(jaarlijks_verbruik || 0),
    product_type: product_type || "solar_panel"
  };

  try {
    const response = await fetch(SOLLIT_API_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify(sollitPayload)
    });

    let data = {};
    try {
      data = await response.json();
    } catch (e) {
      // soms geen JSON body
      data = {};
    }

    if (!response.ok) {
      console.error("Sollit API error:", data);
      res.statusCode = response.status;
      return res.json({
        message: "Error from Sollit API",
        details: data
      });
    }

    res.statusCode = 200;
    return res.json({
      message: "Lead created successfully",
      sollitResponse: data
    });
  } catch (err) {
    console.error("API /api/lead error:", err);
    res.statusCode = 500;
    return res.json({ message: "Server error" });
  }
};
