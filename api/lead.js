// api/lead.js

const SOLLIT_API_URL = "https://app.sollit.com/api/person";

module.exports = async (req, res) => {
  // CORS voor Webflow
  res.setHeader("Access-Control-Allow-Origin", "*"); // eventueel vervangen door je Webflow domein
  res.setHeader("Access-Control-Allow-Methods", "POST,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  // Preflight
  if (req.method === "OPTIONS") {
    res.statusCode = 200;
    return res.end();
  }

  // Alleen POST toegestaan
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

  // Body kan string of object zijn (afhankelijk van Vercel parsing)
  let body = req.body || {};
  if (typeof body === "string") {
    try {
      body = JSON.parse(body);
    } catch (e) {
      res.statusCode = 400;
      return res.json({ message: "Invalid JSON body" });
    }
  }

  console.log("Incoming body from Webflow:", body);

  const {
    postcode,
    number,
    first_name,
    last_name,
    email,
    telephone,
    jaarlijks_verbruik,
    product_type
  } = body;

  // Maak payload voor Sollit – alleen de velden die we echt gebruiken
  const sollitPayload = {
    skip_postcode_check: true,          // we vullen niet alle adresvelden in
    match_person_on_address: false,

    postcode: postcode || "",
    number: number || "",

    first_name: first_name || "",
    last_name: last_name || "",
    email: email || "",
    telephone: telephone || "",
    // mobile laten we leeg voor nu
    mobile: "",

    jaarlijks_verbruik: Number(jaarlijks_verbruik || 0),

    product_type: product_type || "solar_panel",

    // optioneel kun je deze vullen als je wilt
    source_site: "Webflow formulier",
    source_site_url: "" // kun je bv. window.location.origin in frontend meegeven en hier doorsturen
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
    } catch (e) {
      data = {};
    }

    console.log("Response van Sollit:", response.status, data);

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
    console.error("API /api/lead error:", err);
    res.statusCode = 500;
    return res.json({ message: "Server error" });
  }
};
