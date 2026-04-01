import express from "express";
import cors from "cors";

const app = express();

app.use(cors());
app.use(express.json());

app.post("/ai", async (req, res) => {
  try {
    const { cc = "", va = "", iop = "", history = "" } = req.body;

    const ccText = cc.toLowerCase();
    const iopNum = parseInt(iop);

    // 🧠 SCORING SYSTEM
    let scores = {
      glaucoma: 0,
      retinal: 0,
      macular: 0,
      inflammatory: 0
    };

    let flags = [];
    let suggestions = [];

    // 🔴 GLAUCOMA
    if (iopNum >= 30) {
      scores.glaucoma += 70;
      flags.push("🔴 Very high IOP");
    } else if (iopNum >= 22) {
      scores.glaucoma += 40;
    }

    if (history.toLowerCase().includes("glaucoma")) {
      scores.glaucoma += 20;
    }

    // 🟡 RETINAL DETACHMENT / TEAR
    if (ccText.includes("floaters") || ccText.includes("flashes")) {
      scores.retinal += 60;
      flags.push("🟡 Flashes/floaters");
    }

    if (ccText.includes("curtain")) {
      scores.retinal += 80;
      flags.push("🔴 Curtain vision loss");
    }

    // 🟡 MACULAR (AMD / DME / CSCR)
    if (ccText.includes("blur") || ccText.includes("distortion")) {
      scores.macular += 40;
    }

    if (history.toLowerCase().includes("diabetes")) {
      scores.macular += 25;
    }

    // 🟡 INFLAMMATORY
    if (ccText.includes("pain") || ccText.includes("light sensitivity")) {
      scores.inflammatory += 50;
    }

    // 🔧 NORMALIZE TO 100 MAX
    Object.keys(scores).forEach(k => {
      if (scores[k] > 100) scores[k] = 100;
    });

    // 🧠 AUTO SUGGESTIONS
    if (scores.glaucoma > 40) {
      suggestions.push("OCT RNFL, HVF, pachymetry");
    }

    if (scores.retinal > 50) {
      suggestions.push("Dilated fundus exam ASAP");
    }

    if (scores.macular > 40) {
      suggestions.push("Macular OCT");
    }

    if (scores.inflammatory > 40) {
      suggestions.push("Slit lamp exam, AC check");
    }

    // 🤖 AI REASONING
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

Provide:
- Top 3 likely diagnoses
- Key findings supporting each
- Next steps
- Urgency level

Be concise and clinical.
`
          },
          {
            role: "user",
            content: `
CC: ${cc}
VA: ${va}
IOP: ${iop}

History:
${history}
`
          }
        ]
      })
    });

    const data = await response.json();

    res.json({
      result:
`📊 DISEASE PROBABILITY:
Glaucoma: ${scores.glaucoma}%
Retinal (RD/Tear): ${scores.retinal}%
Macular (AMD/DME): ${scores.macular}%
Inflammatory: ${scores.inflammatory}%

⚠️ FLAGS:
${flags.join("\n") || "None"}

🧠 SUGGESTED TESTING:
${suggestions.join("\n") || "None"}

📋 AI ANALYSIS:
${data.choices?.[0]?.message?.content || "No response"}`
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
