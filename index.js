const express = require("express");
const axios = require("axios");
const cors = require("cors");

const app = express();
app.use(cors());

app.get("/api/xhs", async (req, res) => {
  const { url } = req.query;
  if (!url) return res.status(400).json({ error: "Thiếu tham số URL." });

  try {
    const response = await axios.post("https://dlbunny.com/api/xhs", {
      url,
    });

    res.json(response.data);
  } catch (err) {
    res.status(500).json({ error: "Lỗi khi tải video." });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log("Server đang chạy tại http://localhost:" + PORT);
});
