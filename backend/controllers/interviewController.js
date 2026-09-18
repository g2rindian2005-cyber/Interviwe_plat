const pool = require('../config/db');
const { chatComplete, hasAI } = require('../utils/aiClient');
const { LANGUAGE_INSTRUCTION, isValidLanguage, SUPPORTED_LANGUAGES } = require('../utils/languages');

const TECHNOLOGIES = ['AWS', 'Docker', 'Kubernetes', 'Terraform', 'Jenkins', 'Linux', 'GitHub Actions', 'Monitoring'];

// Small offline question bank used when no AI_API_KEY is configured,
// so the interview flow works out of the box.
const FALLBACK_QUESTIONS = {
  Docker: [
    'What is Docker and why is it used?',
    'Explain the difference between a Docker image and a container.',
    'What is a Dockerfile?',
    'How does Docker networking work?',
    'What is Docker Compose used for?',
  ],
  Kubernetes: [
    'What is a Kubernetes Pod?',
    'Explain the difference between a Deployment and a StatefulSet.',
    'What is a Kubernetes Service and why is it needed?',
    'How does Kubernetes handle scaling?',
    'What is a ConfigMap and a Secret?',
  ],
  AWS: [
    'What is EC2 and what is it used for?',
    'Explain the difference between S3 and EBS.',
    'What is an IAM role?',
    'How does an Auto Scaling Group work?',
    'What is a VPC?',
  ],
  Terraform: [
    'What is Terraform and why is it used?',
    'What is the purpose of the Terraform state file?',
    'Explain the difference between a resource and a module.',
    'What does `terraform plan` do?',
    'What is a provider in Terraform?',
  ],
  Jenkins: [
    'What is Jenkins used for?',
    'Explain a Jenkins pipeline.',
    'What is the difference between Freestyle and Pipeline jobs?',
    'What are Jenkins agents/nodes?',
    'How do you trigger a Jenkins build automatically?',
  ],
  Linux: [
    'What is the difference between a process and a thread?',
    'Explain file permissions in Linux.',
    'What does the `grep` command do?',
    'How do you check disk usage in Linux?',
    'What is a shell script?',
  ],
  'GitHub Actions': [
    'What is GitHub Actions used for?',
    'What is a workflow file and where is it stored?',
    'Explain jobs and steps in a workflow.',
    'What are GitHub Actions secrets?',
    'How do you trigger a workflow on push?',
  ],
  Monitoring: [
    'Why is monitoring important in DevOps?',
    'What is the difference between monitoring and logging?',
    'What is Prometheus used for?',
    'What is an alerting threshold?',
    'What is the difference between metrics and traces?',
  ],
};

function translateFallback(question, lang) {
  // Offline mode always serves English fallback text; the frontend TTS
  // will still speak it, and users are encouraged to add an AI_API_KEY
  // for true multilingual question generation.
  return question;
}

exports.getTechnologies = (_req, res) => {
  res.json({ technologies: TECHNOLOGIES, languages: SUPPORTED_LANGUAGES });
};

exports.startInterview = async (req, res) => {
  try {
    const { technology, language, difficulty, interviewType } = req.body;

    if (!TECHNOLOGIES.includes(technology)) {
      return res.status(400).json({ error: 'Invalid technology selected.' });
    }
    if (!isValidLanguage(language)) {
      return res.status(400).json({ error: 'Invalid language selected.' });
    }
    const diff = ['beginner', 'intermediate', 'advanced'].includes(difficulty) ? difficulty : 'beginner';
    const type = interviewType === 'text' ? 'text' : 'voice';

    const result = await pool.query(
      `INSERT INTO interviews (user_id, technology, language, difficulty, interview_type)
       VALUES ($1, $2, $3, $4, $5) RETURNING id`,
      [req.user.id, technology, language, diff, type]
    );
    const interviewId = result.rows[0].id;

    const firstQuestion = await generateQuestion(technology, language, diff, 1, []);

    await pool.query(
      `INSERT INTO interview_questions (interview_id, question_number, question_text)
       VALUES ($1, 1, $2)`,
      [interviewId, firstQuestion]
    );

    res.status(201).json({
      interviewId,
      questionNumber: 1,
      question: firstQuestion,
      voiceLocale: SUPPORTED_LANGUAGES[language].voiceLocale,
    });
  } catch (err) {
    console.error('Start interview error:', err);
    res.status(500).json({ error: 'Server error starting interview.' });
  }
};

async function generateQuestion(technology, language, difficulty, questionNumber, previousQuestions) {
  if (hasAI) {
    const prompt = `You are a technical interviewer for a DevOps interview.
Technology: ${technology}
Difficulty: ${difficulty}
This is question number ${questionNumber} of 10.
Previously asked questions: ${previousQuestions.join(' | ') || 'none'}
${LANGUAGE_INSTRUCTION[language]}
Ask ONE clear, concise interview question about ${technology}. Do not repeat previous questions.
Return ONLY the question text, nothing else.`;

    const aiResponse = await chatComplete([{ role: 'user', content: prompt }], { maxTokens: 150 });
    if (aiResponse) return aiResponse;
  }

  const bank = FALLBACK_QUESTIONS[technology] || FALLBACK_QUESTIONS.Docker;
  const q = bank[(questionNumber - 1) % bank.length];
  return translateFallback(q, language);
}

async function evaluateAnswer(technology, question, answer, language) {
  if (hasAI) {
    const prompt = `You are evaluating a candidate's spoken answer in a DevOps technical interview.
Technology: ${technology}
Question: ${question}
Candidate's answer (transcribed from speech): ${answer}
${LANGUAGE_INSTRUCTION[language]}

Evaluate and return ONLY valid JSON (no markdown, no code fences) in this exact shape:
{"technical_score": <0-100>, "communication_score": <0-100>, "confidence_score": <0-100>, "feedback": "<2-3 sentence feedback in the requested language>"}`;

    const aiResponse = await chatComplete([{ role: 'user', content: prompt }], { maxTokens: 300, temperature: 0.3 });
    if (aiResponse) {
      try {
        const cleaned = aiResponse.replace(/```json|```/g, '').trim();
        const parsed = JSON.parse(cleaned);
        return {
          technical: Number(parsed.technical_score) || 0,
          communication: Number(parsed.communication_score) || 0,
          confidence: Number(parsed.confidence_score) || 0,
          feedback: parsed.feedback || '',
        };
      } catch (e) {
        console.error('Failed to parse AI evaluation JSON:', e.message);
      }
    }
  }

  // Offline fallback: simple heuristic scoring based on answer length/keywords.
  const wordCount = (answer || '').trim().split(/\s+/).filter(Boolean).length;
  const lengthScore = Math.min(100, Math.round((wordCount / 40) * 100));
  const technical = Math.max(30, lengthScore);
  const communication = Math.max(30, Math.min(100, lengthScore + 10));
  const confidence = Math.max(30, Math.min(100, lengthScore - 5));
  return {
    technical,
    communication,
    confidence,
    feedback: 'Automated offline scoring (no AI_API_KEY configured). Add an AI_API_KEY in backend/.env for detailed AI feedback.',
  };
}

exports.submitAnswer = async (req, res) => {
  try {
    const { interviewId, questionNumber, answerText } = req.body;
    if (!interviewId || !questionNumber || answerText === undefined) {
      return res.status(400).json({ error: 'interviewId, questionNumber and answerText are required.' });
    }

    const interviewResult = await pool.query(
      'SELECT * FROM interviews WHERE id = $1 AND user_id = $2',
      [interviewId, req.user.id]
    );
    if (interviewResult.rows.length === 0) {
      return res.status(404).json({ error: 'Interview not found.' });
    }
    const interview = interviewResult.rows[0];

    const questionResult = await pool.query(
      'SELECT * FROM interview_questions WHERE interview_id = $1 AND question_number = $2',
      [interviewId, questionNumber]
    );
    if (questionResult.rows.length === 0) {
      return res.status(404).json({ error: 'Question not found.' });
    }
    const questionRow = questionResult.rows[0];

    const evaluation = await evaluateAnswer(interview.technology, questionRow.question_text, answerText, interview.language);
    const overallQScore = Math.round((evaluation.technical + evaluation.communication + evaluation.confidence) / 3);

    await pool.query(
      `UPDATE interview_questions SET answer_text = $1, ai_feedback = $2, score = $3 WHERE id = $4`,
      [answerText, evaluation.feedback, overallQScore, questionRow.id]
    );

    const TOTAL_QUESTIONS = 10;
    let nextQuestion = null;
    let interviewComplete = false;

    if (questionNumber >= TOTAL_QUESTIONS) {
      interviewComplete = true;
      await finalizeInterview(interviewId, interview);
    } else {
      const prevQs = await pool.query(
        'SELECT question_text FROM interview_questions WHERE interview_id = $1 ORDER BY question_number',
        [interviewId]
      );
      const nextQNum = questionNumber + 1;
      nextQuestion = await generateQuestion(
        interview.technology,
        interview.language,
        interview.difficulty,
        nextQNum,
        prevQs.rows.map((r) => r.question_text)
      );
      await pool.query(
        `INSERT INTO interview_questions (interview_id, question_number, question_text) VALUES ($1, $2, $3)`,
        [interviewId, nextQNum, nextQuestion]
      );
    }

    res.json({
      evaluation,
      interviewComplete,
      nextQuestion: interviewComplete ? null : { questionNumber: questionNumber + 1, question: nextQuestion },
    });
  } catch (err) {
    console.error('Submit answer error:', err);
    res.status(500).json({ error: 'Server error submitting answer.' });
  }
};

async function finalizeInterview(interviewId, interview) {
  const scores = await pool.query(
    'SELECT score FROM interview_questions WHERE interview_id = $1 AND score IS NOT NULL',
    [interviewId]
  );
  const total = scores.rows.length || 1;
  const avgOverall = scores.rows.reduce((sum, r) => sum + Number(r.score), 0) / total;

  await pool.query(
    `UPDATE interviews SET
       total_questions = $1,
       technical_score = $2,
       communication_score = $2,
       confidence_score = $2,
       overall_score = $2,
       status = 'completed',
       completed_at = NOW()
     WHERE id = $3`,
    [total, avgOverall.toFixed(2), interviewId]
  );

  // update learning_progress
  await pool.query(
    `INSERT INTO learning_progress (user_id, technology, interviews_taken, avg_score)
     VALUES ($1, $2, 1, $3)
     ON CONFLICT (user_id, technology)
     DO UPDATE SET
       interviews_taken = learning_progress.interviews_taken + 1,
       avg_score = ((learning_progress.avg_score * learning_progress.interviews_taken) + $3) / (learning_progress.interviews_taken + 1),
       updated_at = NOW()`,
    [interview.user_id, interview.technology, avgOverall.toFixed(2)]
  );
}

exports.getReport = async (req, res) => {
  try {
    const { interviewId } = req.params;
    const interviewResult = await pool.query(
      'SELECT * FROM interviews WHERE id = $1 AND user_id = $2',
      [interviewId, req.user.id]
    );
    if (interviewResult.rows.length === 0) {
      return res.status(404).json({ error: 'Interview not found.' });
    }
    const interview = interviewResult.rows[0];
    const questions = await pool.query(
      'SELECT question_number, question_text, answer_text, ai_feedback, score FROM interview_questions WHERE interview_id = $1 ORDER BY question_number',
      [interviewId]
    );

    res.json({ interview, questions: questions.rows });
  } catch (err) {
    console.error('Get report error:', err);
    res.status(500).json({ error: 'Server error fetching report.' });
  }
};

exports.getHistory = async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT id, technology, language, difficulty, overall_score, status, started_at, completed_at
       FROM interviews WHERE user_id = $1 ORDER BY started_at DESC LIMIT 50`,
      [req.user.id]
    );
    res.json({ interviews: result.rows });
  } catch (err) {
    console.error('Get history error:', err);
    res.status(500).json({ error: 'Server error fetching history.' });
  }
};
