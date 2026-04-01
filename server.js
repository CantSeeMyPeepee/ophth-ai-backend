import express from "express";
import cors from "cors";

const app = express();

app.use(cors());
app.use(express.json());

app.post("/ai", async (req, res) => {
  try {
    const { cc, va, iop, history } = req.body;

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
            content: "You are a highly trained ophthalmology assistant helping guide exams, interpret findings, and suggest next steps."
          },
          {
            role: "user",
            content: `
Chief Complaint: ${cc}
Visual Acuity: ${va}
IOP: ${iop}

History:
${history || "None"}

Provide:
- Likely diagnosis
- Next steps
- Recommended testing
            `
          }
        ]
      })
    });

    const data = await response.json();

    res.json({
      result: data.choices?.[0]?.message?.content || "No response"
    });

  } catch (err) {
    console.error(err);
    res.json({ result: "Error processing request" });
  }
});

app.get("/", (req,res)=>{
  res.send("Ophthalmology AI Running");
});

app.listen(process.env.PORT || 3000, () => {
  console.log("Server running");
});
