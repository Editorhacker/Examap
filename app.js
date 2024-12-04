const express = require('express');
const mongoose = require('mongoose');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Create an Express app
const app = express();

// Middleware
// Serve static files
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.set('view engine', 'ejs');

// Static folder for uploads
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Ensure uploads directory exists
const uploadDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir);
}

// MongoDB connection
mongoose
  .connect('mongodb://localhost:27017/examManagement', {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  })
  .then(() => console.log('Connected to MongoDB'))
  .catch((err) => console.error('Error connecting to MongoDB', err));

// Multer Storage Configuration
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + path.extname(file.originalname));
  },
});

const upload = multer({
  storage: storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB file limit
});

// Mongoose Models
const studentSchema = new mongoose.Schema({
  department: String,
  class: String,
  studentName: String,
  rollNumber: String,
  idCardImage: String,
});

const Student = mongoose.model('Student', studentSchema);

const questionPaperSchema = new mongoose.Schema({
  department: String,
  class: String,
  studentName: String,
  rollNumber: String,
  idCardImage: String,
  questionPaperCode: String,
  questionPaperFile: String,
});

const QuestionPaper = mongoose.model('QuestionPaper', questionPaperSchema);

// Routes
// Add Student Route
app.get('/add-student', (req, res) => {
  res.render('addStudent');
});

app.post('/add-student', upload.single('idCardImage'), (req, res) => {
  const newStudent = new Student({
    department: req.body.department,
    class: req.body.class,
    studentName: req.body.studentName,
    rollNumber: req.body.rollNumber,
    idCardImage: req.file.filename,
  });

  newStudent
    .save()
    .then(() => res.redirect('/add-student'))
    .catch((err) => res.status(400).send('Error adding student: ' + err));
});

// Post Question Paper Route
app.get('/post-question-paper', (req, res) => {
  Student.distinct('department')
    .then((departments) => {
      Student.distinct('class').then((classes) => {
        res.render('postQuestionPaper', { departments, classes });
      });
    })
    .catch((err) => res.status(400).send('Error fetching data: ' + err));
});

app.post('/post-question-paper', upload.single('questionPaperFile'), (req, res) => {
  const { department, class: studentClass, questionPaperCode } = req.body;

  Student.find({ department, class: studentClass })
    .then((students) => {
      const promises = students.map((student) => {
        const newQuestionPaper = new QuestionPaper({
          department,
          class: studentClass,
          studentName: student.studentName,
          rollNumber: student.rollNumber,
          idCardImage: student.idCardImage,
          questionPaperCode,
          questionPaperFile: req.file.filename,
        });
        return newQuestionPaper.save();
      });

      return Promise.all(promises);
    })
    .then(() => res.redirect('/post-question-paper'))
    .catch((err) => res.status(400).send('Error posting question paper: ' + err));
});

// View Question Papers Route
app.get('/view-question-papers', (req, res) => {
  QuestionPaper.find()
    .then((data) => {
      res.render('viewQuestionPapers', { data });
    })
    .catch((err) => res.status(400).send('Error fetching question papers: ' + err));
});

// Start Server
app.listen(5000, () => {
  console.log('Server running on http://localhost:5000');
});
