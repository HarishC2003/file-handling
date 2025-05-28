const express = require('express');
const multer = require('multer');
const bodyParser = require('body-parser');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = 3000;

const UPLOAD_DIR = path.join(__dirname, 'uploads');
const TRASH_DIR = path.join(__dirname, 'trash');

// Ensure directories exist
if (!fs.existsSync(UPLOAD_DIR)) fs.mkdirSync(UPLOAD_DIR);
if (!fs.existsSync(TRASH_DIR)) fs.mkdirSync(TRASH_DIR);

// Configure Multer
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, UPLOAD_DIR),
  filename: (req, file, cb) => cb(null, file.originalname)
});

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowedTypes = [
    'text/plain',                                // .txt
    'image/jpeg', 'image/png',                   // .jpg, .jpeg, .png
    'application/pdf',                           // .pdf
    'application/msword',                        // .doc
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document', // .docx
    'application/vnd.ms-excel',                  // .xls
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',       // .xlsx
    'application/zip', 'application/x-zip-compressed',                         // .zip
    'application/json',                          // .json
    'application/javascript'                     // .js
];
    allowedTypes.includes(file.mimetype) ? cb(null, true) : cb(new Error('Invalid file type'));
  }
});

app.use(bodyParser.json());
app.use(express.static(__dirname));
app.use('/uploads', express.static(UPLOAD_DIR));
app.use('/trash', express.static(TRASH_DIR));

// Routes
app.post('/upload', upload.single('file'), (req, res) => {
  res.redirect('/create.html');
});

app.post('/write', (req, res) => {
  const { filename, content } = req.body;
  const filePath = path.join(UPLOAD_DIR, filename);
  if (fs.existsSync(filePath)) return res.status(400).send('File already exists');
  fs.writeFile(filePath, content, err => {
    if (err) return res.status(500).send('Failed to write file');
    res.send('File created');
  });
});

app.get('/read/:filename', (req, res) => {
  const filename = path.basename(req.params.filename);
  const filePath = path.join(UPLOAD_DIR, filename);
  fs.readFile(filePath, 'utf8', (err, data) => {
    if (err) return res.status(404).send('File not found');
    res.send(data);
  });
});

app.get('/files', (req, res) => {
  fs.readdir(UPLOAD_DIR, (err, files) => {
    if (err) return res.status(500).send('Failed to read files');
    res.json(files);
  });
});

app.get('/trash', (req, res) => {
  fs.readdir(TRASH_DIR, (err, files) => {
    if (err) return res.status(500).send('Failed to read trash');
    const now = Date.now();
    const validFiles = files.filter(file => {
      const timestamp = parseInt(file.split('_')[0]);
      return now - timestamp <= 30 * 24 * 60 * 60 * 1000;
    });
    res.json(validFiles);
  });
});

app.get('/delete/:filename', (req, res) => {
  const filename = path.basename(req.params.filename);
  const src = path.join(UPLOAD_DIR, filename);
  const dest = path.join(TRASH_DIR, Date.now() + '_' + filename);
  fs.rename(src, dest, err => {
    if (err) return res.status(500).send('Failed to delete');
    res.redirect('/files.html');
  });
});

app.get('/restore/:filename', (req, res) => {
  const filename = path.basename(req.params.filename);
  const originalName = filename.split('_').slice(1).join('_');
  const src = path.join(TRASH_DIR, filename);
  const dest = path.join(UPLOAD_DIR, originalName);
  if (fs.existsSync(dest)) return res.status(400).send('File already exists');
  fs.rename(src, dest, err => {
    if (err) return res.status(500).send('Failed to restore');
    res.redirect('/trash.html');
  });
});

// Cleanup old trash files
setInterval(() => {
  const now = Date.now();
  fs.readdir(TRASH_DIR, (err, files) => {
    if (err) return;
    files.forEach(file => {
      const timestamp = parseInt(file.split('_')[0]);
      if (now - timestamp > 30 * 24 * 60 * 60 * 1000) {
        fs.unlink(path.join(TRASH_DIR, file), () => {});
      }
    });
  });
}, 24 * 60 * 60 * 1000); // Every 24 hours

app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});
