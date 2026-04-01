import express from "express";
import cors from "cors";

const app = express();
app.use(cors());
app.use(express.json());

app.post("/ai", async (req, res) => {
  try {
    const {
      cc = "",
      va_od = "",
      va_os = "",
      iop_od = "",
      iop_os = "",
      history = ""
    } = req.body;

    const ccText = cc.toLowerCase();

    const od = { glaucoma: 0, retinal: 0, macular: 0 };
    const os = { glaucoma: 0, retinal: 0, macular: 0 };

    let flags = [];
    let suggestions = [];

    const iopOD = parseInt(iop_od);
    const iopOS = parseInt(iop_os);

    // 🔴 GLAUCOMA LOGIC
    if (iopOD >= 30) {
      od.glaucoma += 70;
      flags.push("🔴 OD high IOP");
    } else if (iopOD >= 22) {
      od.glaucoma += 40;
    }

    if (iopOS >= 30) {
      os.glaucoma += 70;
      flags.push("🔴 OS high IOP");
    } else if (iopOS >= 22) {
      os.glaucoma += 40;
    }

    // 🟡 RETINAL
    if (ccText.includes("floaters") || ccText.includes("flashes")) {
      od.retinal += 50;
      os.retinal += 50;
      flags.push("🟡 Floaters/flashes");
    }

    if (ccText.includes("curtain")) {
      od.retinal += 80;
      os.retinal += 80;
      flags.push("🔴 Curtain vision loss");
    }

    // 🟡 MACULAR
    if (ccText.includes("blur") || ccText.includes("distortion")) {
      od.macular += 40;
      os.macular += 40;
    }

    if (history.toLowerCase().includes("diabetes")) {
      od.macular += 25;
      os.macular += 25;
    }

    // 🧠 BILATERAL LOGIC
    let bilateral = "";

    if (Math.abs(iopOD - iopOS) <= 2 && iopOD > 22 && iopOS > 22) {
      bilateral = "🧠 Symmetric elevated IOP → likely glaucoma pattern";
    }

    if (Math.abs(iopOD - iopOS) >= 8) {
      bilateral = "⚠️ Significant asymmetry → investigate secondary causes";
    }

    // 🔧 LIMIT TO 100
    [od, os].forEach(eye => {
      Object.keys(eye).forEach(k => {
        if (eye[k] > 100) eye[k] = 100;
      });
    });

    // 🧠 SUGGESTIONS
    if (od.glaucoma > 40 || os.glaucoma > 40) {
      suggestions.push("OCT RNFL, HVF, pachymetry");
    }

    if (od.retinal > 50 || os.retinal > 50) {
      suggestions.push("Dilated fundus exam ASAP");
    }

    if (od.macular > 40 || os.macular > 40) {
      suggestions.push("Macular OCT");
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

Interpret OD and OS separately when appropriate.

Provide:
- Likely diagnoses
- Key findings
- Next steps
- Urgency

Be concise and clinical.
`
          },
          {
            role: "user",
            content: `
CC: ${cc}

OD:
VA ${va_od}, IOP ${iop_od}

OS:
VA ${va_os}, IOP ${iop_os}

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
`📊 OD SCORES:
Glaucoma: ${od.glaucoma}%
Retinal: ${od.retinal}%
Macular: ${od.macular}%

📊 OS SCORES:
Glaucoma: ${os.glaucoma}%
Retinal: ${os.retinal}%
Macular: ${os.macular}%

🧠 BILATERAL:
${bilateral || "No major pattern"}

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
