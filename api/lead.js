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

// Helper: netaansluiting formatteren
function formatNetConnection(value) {
  if (!value) return "";
  const v = String(value).trim().toLowerCase();
  if (v === "1-fase") return "1-fase";
  if (v === "3-fase") return "3-fase";
  if (v === "weet-ik-niet") return "Onbekend";
  return value;
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
    request_type,    // 0/1 uit Webflow (alleen voor zakelijk-flag)
    company_name,
    product_type,    // "solar_panel" / "battery" / "charge_station"
    type_woning,
    net_connection   // "1-fase" / "3-fase" / "weet-ik-niet"
  } = body || {};

  const normalizedProductType = product_type || "solar_panel";
  const formattedTypeWoning = formatTypeWoning(type_woning);
  const formattedNetConnection = formatNetConnection(net_connection);

  // 🔥 Zakelijk status logic (alleen voor client_status_id)
  let clientStatusId = undefined;
  if (request_type == 1) {
    clientStatusId = 212860; // zakelijk aangevinkt
  }

  // 🔥 Product-ID mapping voor request_type richting Sollit
  // Pas deze IDs aan als jouw echte product/aanvraag IDs anders zijn
  const requestTypeMap = {
    solar_panel: 4000,
    battery: 6920,
    charge_station: 4408
  };

  const requestTypeForSollit = requestTypeMap[normalizedProductType] || 0;

  // Extra velden opbouwen
  const extraFields = {};
  if (formattedTypeWoning) {
    extraFields["type-woning"] = formattedTypeWoning;
  }
  if (formattedNetConnection) {
    extraFields["net-aansluiting"] = formattedNetConnection;
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

    // 🔥 product info
    product_type: normalizedProductType,
    person_product_types: [normalizedProductType],
    person_product_types_string: normalizedProductType,

    // 🔥 request_type als PRODUCT-ID naar Sollit
    request_type: requestTypeForSollit,

    // 🔥 zakelijk status via client_status_id
    company_name: company_name || "",
    client_status_id: clientStatusId,

    // 🔥 extra velden (woningtype + netaansluiting)
    extra_fields_key: "webflow-extra",
    extra_fields: extraFields,

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
