import express from "express";
import cors from "cors";
import * as deepl from "deepl-node";

const app = express();
const PORT = 3001;

app.use(cors());
app.use(express.json());

const authKey = process.env.AUTH_KEY;

const translator = new deepl.Translator(authKey);

app.post("/translate", async (req, res) => {
  const { text, targetLang, sourceLang } = req.body;
  if (!text || !targetLang || !sourceLang) {
    return res.status(400).json({ error: "Missing text, sourceLang, or targetLang" });
  }
  try {
    const result = await translator.translateText(text, sourceLang, targetLang);
    res.json({ translation: result.text });
  } catch (e) {
    console.error("DeepL error:", e);
    res.status(500).json({ error: "Translation failed", details: e.message });
  }
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});


