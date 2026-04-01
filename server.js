import express from "express";
import cors from "cors";

const app = express();

app.use(cors());
app.use(express.json());

app.post("/ai", async (req, res) => {
  try {
    const { cc, va, iop, history } = req.body;

    // 🧠 BASIC CLINICAL LOGIC (fast + reliable)
    let flags = [];
    let suggestions = [];

    const iopNum = parseInt(iop);

    if (iopNum >= 30) {
      flags.push("🔴 High IOP — possible glaucoma / angle closure risk");
      suggestions.push("Check angles, consider urgent pressure lowering");
    } else if (iopNum >= 22) {
      flags.push("🟡 Elevated IOP — glaucoma suspect");
      suggestions.push("OCT RNFL, HVF, pachymetry");
    }

    if (cc?.toLowerCase().includes("floaters") || cc?.toLowerCase().includes("flashes")) {
      flags.push("🟡 Possible retinal tear / detachment");
      suggestions.push("Dilated fundus exam ASAP");
    }

    if (cc?.toLowerCase().includes("blur")) {
      suggestions.push("Refraction + macular OCT");
    }

    // 🧠 AI reasoning layer
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${process.env.OPENAI_API_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [
          {
            role: "system",
            content: `
You are an expert ophthalmology assistant.

Think like a clinician.

Always provide:
1. Likely diagnoses (ranked)
2. Key supporting findings
3. Next diagnostic steps
4. Treatment considerations
5. Urgency level (Routine / Urgent / Emergent)

Be concise and clinical.
`
          },
          {
            role: "user",
            content: `
Chief Complaint: ${cc}
Visual Acuity: ${va}
IOP: ${iop}

History:
${history || "None"}
`
          }
        ]
      })
    });

    const data = await response.json();

    res.json({
      result:
        "⚠️ FLAGS:\n" + (flags.join("\n") || "None") +
        "\n\n🧠 CLINICAL SUGGESTIONS:\n" + (suggestions.join("\n") || "None") +
        "\n\n📋 AI ANALYSIS:\n" +
        (data.choices?.[0]?.message?.content || "No response")
    });

  } catch (err) {
    console.error(err);
    res.json({ result: "Error processing request" });
  }
});

app.get("/", (req, res) => {
  res.send("Ophthalmology AI Running");
});

app.listen(process.env.PORT || 3000, () => {
  console.log("Server running");
});
