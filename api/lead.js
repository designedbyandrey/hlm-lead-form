// api/lead.js

const SOLLIT_API_URL = "https://app.sollit.com/api/person";

// Helper: type-woning formatteren
function formatTypeWoning(value) {
  if (!value) return "";
  const v = String(value).trim().toLowerCase();

  const map = {
    "vrijstaand": "Vrijstaand",
    "2-onder-1-kap": "2-onder-1-kap",
    "hoekwoning": "Hoekwoning",
    "appartement": "Appartement"
  };

  return map[v] || value;
}

module.exports = async (req, res) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    res.statusCode = 200;
    return res.end();
  }

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

  const {
    postcode,
    number,
    first_name,
    last_name,
    email,
    telephone,
    jaarlijks_verbruik,
    comments,
    request_type,
    company_name,
    product_type,
    type_woning
  } = body || {};

  const normalizedProductType = product_type || "solar_panel";
  const formattedTypeWoning = formatTypeWoning(type_woning);

  // 🔥 Zakelijk status logic
  let clientStatusId = undefined;
  if (request_type == 1) {
    clientStatusId = 212860; // zakelijk aangevinkt
  }

  // 🔥 Leadtype-ID op basis van product type (HEEL SIMPEL)
  let leadTypeId;
  if (normalizedProductType === "solar_panel") {
    leadTypeId = 4000;
  } else if (normalizedProductType === "charge_station") {
    leadTypeId = 4408;
  } else if (normalizedProductType === "battery") {
    leadTypeId = 6920;
  }

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

    // product info
    product_type: normalizedProductType,
    person_product_types: [normalizedProductType],
    person_product_types_string: normalizedProductType,

    // zakelijk/particulier
    request_type: Number(request_type || 0),
    company_name: company_name || "",

    // zakelijk status id
    client_status_id: clientStatusId,

    // extra velden
    extra_fields_key: "type-woning",
    extra_fields: {
      "type-woning": formattedTypeWoning
    },

    source_site: "Webflow formulier",
    source_site_url: ""
  };

  // 👇 Alleen toevoegen als we daadwerkelijk een leadTypeId hebben
  if (leadTypeId) {
    sollitPayload.second_client_status_id = leadTypeId;
  }

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
    try { data = await response.json(); } catch {}

    if (!response.ok) {
      console.error("Sollit API error:", response.status, data);
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
