
const express = require('express');
const bodyParser = require('body-parser');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = 3000;

const FILES_DIR = path.join(__dirname, 'files');
const TRASH_DIR = path.join(__dirname, 'trash');

// Ensure directories exist
if (!fs.existsSync(FILES_DIR)) fs.mkdirSync(FILES_DIR);
if (!fs.existsSync(TRASH_DIR)) fs.mkdirSync(TRASH_DIR);

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Static file serving
app.use(express.static(path.join(__dirname, 'public')));
app.use('/components', express.static(path.join(__dirname, 'components')));
app.use(express.static(__dirname)); // ✅ Serve root-level HTML like files.html

// Create a new file
app.post('/create', (req, res) => {
  const { filename, content } = req.body;
  const filePath = path.join(FILES_DIR, filename);
  if (fs.existsSync(filePath)) return res.status(400).send('File already exists');
  fs.writeFileSync(filePath, content);
  res.send('File created');
});

// Read a file
app.get('/read/:filename', (req, res) => {
  const filePath = path.join(FILES_DIR, req.params.filename);
  if (!fs.existsSync(filePath)) return res.status(404).send('File not found');
  const content = fs.readFileSync(filePath, 'utf8');
  res.send(content);
});

// List all files
app.get('/list', (req, res) => {
  const files = fs.readdirSync(FILES_DIR);
  res.json(files);
});

// Update file content
app.post('/update', (req, res) => {
  const { filename, content } = req.body;
  const filePath = path.join(FILES_DIR, filename);
  if (!fs.existsSync(filePath)) return res.status(404).send('File not found');
  fs.writeFileSync(filePath, content);
  res.send('File updated');
});

// Delete file (move to trash)
app.post('/delete', (req, res) => {
  const { filename } = req.body;
  const filePath = path.join(FILES_DIR, filename);
  const trashPath = path.join(TRASH_DIR, filename);
  if (!fs.existsSync(filePath)) return res.status(404).send('File not found');
  fs.renameSync(filePath, trashPath);
  res.send('File moved to trash');
});

// Restore file from trash
app.post('/restore', (req, res) => {
  const { filename } = req.body;
  const trashPath = path.join(TRASH_DIR, filename);
  const filePath = path.join(FILES_DIR, filename);
  if (!fs.existsSync(trashPath)) return res.status(404).send('File not in trash');
  fs.renameSync(trashPath, filePath);
  res.send('File restored');
});

// List files in trash
app.get('/trash-list', (req, res) => {
  const files = fs.readdirSync(TRASH_DIR);
  res.json(files);
});

// Serve index.html at root
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));
