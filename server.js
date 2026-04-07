const express = require('express');
const path = require('path');
const app = express();
const PORT = process.env.PORT || 3000;

// Serve React build output
const distPath = path.join(__dirname, 'client', 'dist');
app.use(express.static(distPath));

// SPA fallback — all routes serve index.html
app.get('*', (req, res) => {
  res.sendFile(path.join(distPath, 'index.html'));
});

app.listen(PORT, () => {
  console.log(`Kanban Pro running on port ${PORT}`);
});
