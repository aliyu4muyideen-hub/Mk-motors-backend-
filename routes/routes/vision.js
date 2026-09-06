const express = require("express");
const multer = require("multer");
const { requireAdmin } = require("../middleware/auth");

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 15 * 1024 * 1024 } });

router.post("/identify", requireAdmin, upload.single("photo"), async (req, res) => {
  if (!process.env.NVIDIA_API_KEY) {
    return res.status(400).json({ error: "Photo identification isn't set up yet — add NVIDIA_API_KEY to your backend's environment variables to enable it." });
  }
  if (!req.file) {
    return res.status(400).json({ error: "No photo uploaded — field name must be 'photo'." });
  }

  try {
    const base64 = req.file.buffer.toString("base64");
    const dataUrl = `data:${req.file.mimetype};base64,${base64}`;

    const response = await fetch("https://integrate.api.nvidia.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.NVIDIA_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "meta/llama-3.2-11b-vision-instruct",
        messages: [
          {
            role: "user",
            content: [
              {
                type: "text",
                text: 'Look at this vehicle photo. Reply with ONLY a JSON object, no other words, no markdown formatting, in exactly this shape: {"year":"","make":"","model":"","bodyType":"","exteriorColor":""}. bodyType must be exactly one of: Sedan, SUV, Truck, Hatchback, Van. Leave a field as an empty string if you are not reasonably confident about it — do not guess wildly.',
              },
              { type: "image_url", image_url: { url: dataUrl } },
            ],
          },
        ],
        max_tokens: 250,
        temperature: 0.2,
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error("NVIDIA vision API error:", response.status, errText);
      return res.status(502).json({ error: "The photo identification service didn't respond correctly. Try again in a moment." });
    }

    const data = await response.json();
    const text = data.choices?.[0]?.message?.content || "";
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      return res.status(422).json({ error: "Couldn't make sense of that photo — try a clearer, well-lit shot of the whole car." });
    }

    let parsed;
    try {
      parsed = JSON.parse(jsonMatch[0]);
    } catch {
      return res.status(422).json({ error: "Couldn't make sense of that photo — try a clearer shot." });
    }

    res.json(parsed);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Something went wrong identifying the photo." });
  }
});

module.exports = router;
