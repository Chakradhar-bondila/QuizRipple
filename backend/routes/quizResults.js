/* routes/quizResults.js */
const express   = require('express');
const mongoose  = require('mongoose');
const auth      = require('../middleware/auth');   // <-- your JWT middleware
const router    = express.Router();

/* ------------------------------------------------------------------ */
/* 1. Schema – only truly-required fields are enforced                */
/* ------------------------------------------------------------------ */
const QuestionSchema = new mongoose.Schema({
  questionId:      { type: String,  required: true },
  questionNumber:  { type: Number,  required: true, min: 1 },
  questionText:    { type: String,  required: true },
  userAnswerText:  { type: String,  default: '' },
  correctAnswerText:{type: String,  default: '' },
  status:          { type: String,  enum: ['correct', 'incorrect', 'skipped'], required: true },
  timeSpent:       { type: Number,  default: 0 },         //  seconds
  points:          { type: Number,  default: 0 },
  difficulty:      { type: String,  enum: ['easy','medium','hard'], default: 'medium' },
  category:        { type: String,  default: '' },
  wasReviewed:     { type: Boolean, default: false }
});

const ResultSchema = new mongoose.Schema(
  {
    userId:  { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },

    quizConfig: {
      title:          { type: String, default: 'Quiz' },
      timeLimit:      { type: Number, default: 1800 },              // seconds
      passingScore:   { type: Number, default: 70 },
      totalQuestions: { type: Number, required: true }
    },

    student: {
      name:  { type: String, required: true },
      email: { type: String, required: true }
    },

    stats: {
      correctAnswers:   { type: Number, required: true },
      skippedQuestions: { type: Number, default: 0 },
      answeredQuestions:{ type: Number, required: true },
      totalScore:       { type: Number, required: true },
      maxScore:         { type: Number, required: true },
      percentage:       { type: Number, required: true, min: 0, max: 100 },
      grade:            { type: String, required: true },
      passed:           { type: Boolean, required: true }
    },

    timing: {
      startTime:              { type: Date,   required: true },
      submitTime:             { type: Date,   required: true },
      totalTimeSpent:         { type: Number, required: true }, // ms
      totalTimeSpentFormatted:{ type: String, required: true },
      averageTimePerQuestion: { type: Number, required: true }  // seconds
    },

    submission: {
      reason:     { type: String, enum: ['completed','time_up','manual_submit','auto_submit'], default: 'completed' },
      timestamp:  { type: Date, default: Date.now }
    },

    questionResults: { type: [QuestionSchema], default: [] },

    analytics: {
      summary:             { type: mongoose.Schema.Types.Mixed, default: {} },
      categoryBreakdown:   { type: mongoose.Schema.Types.Mixed, default: {} },
      difficultyBreakdown: { type: mongoose.Schema.Types.Mixed, default: {} },
      timeAnalysis:        { type: mongoose.Schema.Types.Mixed, default: {} }
    }
  },
  { timestamps: true }
);

ResultSchema.index({ userId: 1, createdAt: -1 });
const QuizResult = mongoose.model('QuizResult', ResultSchema);

/* ------------------------------------------------------------------ */
/* 2.  Simple payload check – only the top-level essentials           */
/* ------------------------------------------------------------------ */
function validatePayload(req, res, next) {
  const r = req.body?.results;
  if (!r)
    return res.status(400).json({ error: 'Results payload missing' });

  const required = ['totalQuestions', 'correctAnswers', 'answeredQuestions',
                    'totalScore', 'maxScore', 'percentage', 'grade', 'passed'];

  for (const key of required) {
    if (r[key] === undefined)
      return res.status(400).json({ error: `Missing field ${key}` });
  }
  return next();
}

/* ------------------------------------------------------------------ */
/* 3.  POST / – save one quiz result                                  */
/* ------------------------------------------------------------------ */
router.post('/', auth, validatePayload, async (req, res) => {
  try {
    const r = req.body.results;

    const doc = await QuizResult.create({
      userId: req.user.id,
      quizConfig: { ...r.quizConfig, totalQuestions: r.totalQuestions },
      student:    r.student || { name: req.user.name, email: req.user.email },
      stats: {
        correctAnswers:   r.correctAnswers,
        skippedQuestions: r.skippedQuestions || 0,
        answeredQuestions: r.answeredQuestions,
        totalScore:       r.totalScore,
        maxScore:         r.maxScore,
        percentage:       r.percentage,
        grade:            r.grade,
        passed:           r.passed
      },
      timing:    r.timing,
      submission:r.submission || {},
      questionResults: r.questionResults || [],
      analytics: r.analytics || {}
    });

    res.status(201).json({ success: true, id: doc._id });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Save failed' });
  }
});

/* ------------------------------------------------------------------ */
/* 4.  GET /user/:id              – paginated history                 */
/* 5.  GET /user/:id/latest       – last attempt                      */
/* 6.  GET /:resultId             – single result                     */
/* 7.  DELETE /:resultId          – remove result                     */
/* ------------------------------------------------------------------ */
router.get('/user/:id', auth, async (req, res) => {
  if (req.params.id !== req.user.id.toString())
    return res.status(403).json({ error: 'Forbidden' });

  const page  = +req.query.page  || 1;
  const limit = +req.query.limit || 20;
  const skip  = (page - 1) * limit;

  const [items, total] = await Promise.all([
    QuizResult.find({ userId: req.user.id })
      .sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
    QuizResult.countDocuments({ userId: req.user.id })
  ]);

  res.json({ items, total, page, totalPages: Math.ceil(total / limit) });
});

router.get('/user/:id/latest', auth, async (req, res) => {
  if (req.params.id !== req.user.id.toString())
    return res.status(403).json({ error: 'Forbidden' });

  const latest = await QuizResult.findOne({ userId: req.user.id })
    .sort({ createdAt: -1 }).lean();

  if (!latest) return res.status(404).json({ error: 'No results' });
  res.json(latest);
});

router.get('/:resultId', auth, async (req, res) => {
  if (!mongoose.Types.ObjectId.isValid(req.params.resultId))
    return res.status(400).json({ error: 'Bad id' });

  const doc = await QuizResult.findOne({
    _id: req.params.resultId,
    userId: req.user.id
  }).lean();

  if (!doc) return res.status(404).json({ error: 'Not found' });
  res.json(doc);
});

router.delete('/:resultId', auth, async (req, res) => {
  if (!mongoose.Types.ObjectId.isValid(req.params.resultId))
    return res.status(400).json({ error: 'Bad id' });

  const del = await QuizResult.findOneAndDelete({
    _id: req.params.resultId,
    userId: req.user.id
  });

  if (!del) return res.status(404).json({ error: 'Not found' });
  res.json({ success: true });
});

module.exports = router;
