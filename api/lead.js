// api/lead.js

const SOLLIT_API_URL = "https://app.sollit.com/api/person";

module.exports = async (req, res) => {
  // CORS voor Webflow
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  // Preflight
  if (req.method === "OPTIONS") {
    res.statusCode = 200;
    return res.end();
  }

  // Alleen POST
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

  // Body normaliseren
  let body = req.body;
  if (typeof body === "string") {
    try {
      body = JSON.parse(body);
    } catch {
      res.statusCode = 400;
      return res.json({ message: "Invalid JSON" });
    }
  }

  console.log("Incoming body:", body);

  const {
    postcode,
    number,
    first_name,
    last_name,
    email,
    telephone,
    jaarlijks_verbruik,
    product_type,
    comments,
    request_type
  } = body || {};

  // Payload richting Sollit
  const sollitPayload = {
    skip_postcode_check: true,
    match_person_on_address: false,

    postcode: postcode || "",
    number: number || "",

    first_name: first_name || "",
    last_name: last_name || "",
    email: email || "",
    telephone: telephone || "",
    mobile: "",

    comments: comments || "",

    jaarlijks_verbruik: Number(jaarlijks_verbruik || 0),
    product_type: product_type || "solar_panel",

    // 👇 0 = particulier, 1 = zakelijk
    request_type: Number(request_type || 0),

    // optioneel later nog gebruiken
    company_name: "",

    source_site: "Webflow formulier",
    source_site_url: ""
  };

  console.log("Payload naar Sollit:", sollitPayload);

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
    } catch {}

    console.log("Sollit response:", response.status, data);

    if (!response.ok) {
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
    console.error("Server error:", err);
    res.statusCode = 500;
    return res.json({ message: "Server error" });
  }
};
