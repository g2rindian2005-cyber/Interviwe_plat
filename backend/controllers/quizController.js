const pool = require('../config/db');
const { isValidLanguage } = require('../utils/languages');

// Offline multiple-choice quiz bank (English base; frontend can translate labels via i18n if needed).
// Each technology has 5 questions to keep the payload light; extend freely.
const QUIZ_BANK = {
  Docker: [
    { q: 'What command builds a Docker image from a Dockerfile?', options: ['docker run', 'docker build', 'docker pull', 'docker exec'], answer: 1 },
    { q: 'Which file defines the steps to build a Docker image?', options: ['docker-compose.yml', 'Dockerfile', 'image.json', 'build.sh'], answer: 1 },
    { q: 'What does "docker ps" show?', options: ['Images', 'Running containers', 'Volumes', 'Networks'], answer: 1 },
    { q: 'What is a Docker volume used for?', options: ['Networking', 'Persistent storage', 'Building images', 'Logging'], answer: 1 },
    { q: 'Which command stops a running container?', options: ['docker kill', 'docker stop', 'docker rm', 'docker pause'], answer: 1 },
  ],
  Kubernetes: [
    { q: 'What is the smallest deployable unit in Kubernetes?', options: ['Node', 'Pod', 'Cluster', 'Container'], answer: 1 },
    { q: 'Which object exposes Pods as a network service?', options: ['Deployment', 'Service', 'ConfigMap', 'Ingress'], answer: 1 },
    { q: 'What manages Pod replicas and rolling updates?', options: ['Deployment', 'Secret', 'Namespace', 'PVC'], answer: 0 },
    { q: 'What stores non-sensitive configuration data?', options: ['Secret', 'ConfigMap', 'Pod', 'Job'], answer: 1 },
    { q: 'What command applies a manifest file?', options: ['kubectl apply -f', 'kubectl run', 'kubectl create pod', 'kubectl deploy'], answer: 0 },
  ],
  AWS: [
    { q: 'What does EC2 provide?', options: ['Object storage', 'Virtual servers', 'DNS', 'Email'], answer: 1 },
    { q: 'What is S3 used for?', options: ['Compute', 'Object storage', 'Networking', 'Monitoring'], answer: 1 },
    { q: 'What manages user permissions in AWS?', options: ['IAM', 'VPC', 'S3', 'EC2'], answer: 0 },
    { q: 'What is a VPC?', options: ['A virtual private network', 'A storage bucket', 'A compute instance', 'A CDN'], answer: 0 },
    { q: 'What automatically adjusts EC2 capacity?', options: ['Auto Scaling Group', 'S3 lifecycle', 'IAM policy', 'Route 53'], answer: 0 },
  ],
  Terraform: [
    { q: 'What language does Terraform use?', options: ['YAML', 'HCL', 'JSON only', 'XML'], answer: 1 },
    { q: 'What does "terraform plan" do?', options: ['Applies changes', 'Shows execution plan', 'Destroys resources', 'Initializes backend'], answer: 1 },
    { q: 'What tracks the current infrastructure state?', options: ['State file', 'Provider block', 'Module', 'Variable file'], answer: 0 },
    { q: 'What command initializes a working directory?', options: ['terraform init', 'terraform start', 'terraform setup', 'terraform new'], answer: 0 },
    { q: 'What is a reusable Terraform configuration called?', options: ['Provider', 'Module', 'Resource', 'Output'], answer: 1 },
  ],
  Jenkins: [
    { q: 'What is Jenkins primarily used for?', options: ['CI/CD automation', 'Object storage', 'DNS management', 'Load balancing'], answer: 0 },
    { q: 'What file defines a Jenkins Pipeline as code?', options: ['Jenkinsfile', 'pipeline.yml', 'build.xml', 'config.groovy'], answer: 0 },
    { q: 'What executes Jenkins build jobs?', options: ['Agents/Nodes', 'Plugins only', 'The master UI', 'Webhooks'], answer: 0 },
    { q: 'Which pipeline type is defined in a single script?', options: ['Freestyle', 'Declarative Pipeline', 'Multi-config', 'Matrix'], answer: 1 },
    { q: 'What triggers a build automatically on code push?', options: ['Manual trigger', 'Webhook', 'Cron only', 'Email'], answer: 1 },
  ],
  Linux: [
    { q: 'Which command lists files in a directory?', options: ['ls', 'cd', 'pwd', 'rm'], answer: 0 },
    { q: 'Which command shows current disk usage?', options: ['df', 'top', 'ps', 'kill'], answer: 0 },
    { q: 'What does "chmod 755" do?', options: ['Changes ownership', 'Changes permissions', 'Deletes a file', 'Compresses a file'], answer: 1 },
    { q: 'Which command searches text inside files?', options: ['grep', 'find', 'awk', 'sed'], answer: 0 },
    { q: 'What does "ps" display?', options: ['Running processes', 'Disk partitions', 'Network ports', 'User accounts'], answer: 0 },
  ],
  'GitHub Actions': [
    { q: 'Where are GitHub Actions workflows stored?', options: ['.github/workflows/', '.circleci/', '.actions/', 'workflows/'], answer: 0 },
    { q: 'What format are workflow files written in?', options: ['JSON', 'YAML', 'XML', 'TOML'], answer: 1 },
    { q: 'What triggers a workflow on code push?', options: ['on: push', 'trigger: push', 'run: push', 'event: commit'], answer: 0 },
    { q: 'What stores sensitive values like API keys?', options: ['Environment variables only', 'Secrets', 'Artifacts', 'Cache'], answer: 1 },
    { q: 'What groups a set of steps in a workflow?', options: ['Job', 'Action', 'Runner', 'Event'], answer: 0 },
  ],
  Monitoring: [
    { q: 'What is Prometheus primarily used for?', options: ['Log storage', 'Metrics collection', 'CI/CD', 'Container orchestration'], answer: 1 },
    { q: 'What visualizes metrics in dashboards?', options: ['Grafana', 'Jenkins', 'Terraform', 'Docker'], answer: 0 },
    { q: 'What is an alert threshold used for?', options: ['Triggering notifications', 'Storing logs', 'Building images', 'Scaling compute'], answer: 0 },
    { q: 'What is the difference between metrics and logs?', options: ['No difference', 'Metrics are numeric, logs are event records', 'Logs are numeric', 'Metrics require no storage'], answer: 1 },
    { q: 'What does uptime monitoring track?', options: ['Service availability', 'Code quality', 'Git commits', 'Build time'], answer: 0 },
  ],
};

exports.getQuiz = (req, res) => {
  const { technology } = req.params;
  const bank = QUIZ_BANK[technology];
  if (!bank) {
    return res.status(404).json({ error: 'No quiz available for this technology.' });
  }
  // Strip correct answer before sending to client
  const questions = bank.map((item, idx) => ({
    id: idx,
    question: item.q,
    options: item.options,
  }));
  res.json({ technology, questions });
};

exports.submitQuiz = async (req, res) => {
  try {
    const { technology, language, answers } = req.body; // answers: [{id, selected}]
    const bank = QUIZ_BANK[technology];
    if (!bank) {
      return res.status(404).json({ error: 'No quiz available for this technology.' });
    }
    if (!Array.isArray(answers)) {
      return res.status(400).json({ error: 'answers array is required.' });
    }
    const lang = isValidLanguage(language) ? language : 'en';

    let correct = 0;
    answers.forEach(({ id, selected }) => {
      if (bank[id] && bank[id].answer === selected) correct += 1;
    });
    const total = bank.length;
    const score = Number(((correct / total) * 100).toFixed(2));

    await pool.query(
      `INSERT INTO quiz_attempts (user_id, technology, language, total_questions, correct_answers, score)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [req.user.id, technology, lang, total, correct, score]
    );

    await pool.query(
      `INSERT INTO learning_progress (user_id, technology, quizzes_taken, avg_score)
       VALUES ($1, $2, 1, $3)
       ON CONFLICT (user_id, technology)
       DO UPDATE SET
         quizzes_taken = learning_progress.quizzes_taken + 1,
         avg_score = ((learning_progress.avg_score * learning_progress.quizzes_taken) + $3) / (learning_progress.quizzes_taken + 1),
         updated_at = NOW()`,
      [req.user.id, technology, score]
    );

    res.json({ correct, total, score });
  } catch (err) {
    console.error('Submit quiz error:', err);
    res.status(500).json({ error: 'Server error submitting quiz.' });
  }
};
