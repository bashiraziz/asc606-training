import React, {useState} from 'react';
import styles from './quiz.module.css';

interface Question {
  q: string;
  options: string[];
  correct: number;
  explanation: string;
}

export default function Quiz({questions}: {questions: Question[]}) {
  const [current, setCurrent] = useState(0);
  const [selected, setSelected] = useState<number | null>(null);
  const [answered, setAnswered] = useState(false);
  const [score, setScore] = useState(0);
  const [done, setDone] = useState(false);

  const q = questions[current];

  function choose(i: number) {
    if (answered) return;
    setSelected(i);
    setAnswered(true);
    if (i === q.correct) setScore(s => s + 1);
  }

  function next() {
    if (current + 1 >= questions.length) {
      setDone(true);
    } else {
      setCurrent(c => c + 1);
      setSelected(null);
      setAnswered(false);
    }
  }

  function reset() {
    setCurrent(0);
    setSelected(null);
    setAnswered(false);
    setScore(0);
    setDone(false);
  }

  if (done) {
    const pct = Math.round((score / questions.length) * 100);
    return (
      <div className={styles.quiz}>
        <div className={styles.header}>
          <span>Knowledge check — complete</span>
        </div>
        <div className={styles.scoreCard}>
          <div className={styles.scoreBig}>{score} / {questions.length}</div>
          <div className={styles.scorePct}>{pct}%</div>
          <div className={styles.scoreMsg}>
            {pct === 100 ? 'Perfect score — excellent work!' :
             pct >= 80 ? 'Strong result — ready to move on.' :
             pct >= 60 ? 'Good effort — review the sections you missed.' :
             'Review this module before continuing.'}
          </div>
        </div>
        <button className={styles.btn} onClick={reset}>Retry quiz</button>
      </div>
    );
  }

  return (
    <div className={styles.quiz}>
      <div className={styles.header}>
        <span>Knowledge check</span>
        <span className={styles.progress}>Question {current + 1} of {questions.length}</span>
      </div>
      <div className={styles.qText}>{q.q}</div>
      <div className={styles.options}>
        {q.options.map((opt, i) => {
          let cls = styles.option;
          if (answered) {
            if (i === q.correct) cls = `${styles.option} ${styles.correct}`;
            else if (i === selected) cls = `${styles.option} ${styles.wrong}`;
          }
          return (
            <button
              key={i}
              className={cls}
              onClick={() => choose(i)}
              disabled={answered}
            >
              <span className={styles.optLetter}>{String.fromCharCode(65 + i)}</span>
              {opt}
            </button>
          );
        })}
      </div>
      {answered && (
        <div className={selected === q.correct ? styles.expOk : styles.expWrong}>
          <strong>{selected === q.correct ? 'Correct.' : 'Incorrect.'}</strong>{' '}{q.explanation}
        </div>
      )}
      {answered && (
        <button className={styles.btnPrimary} onClick={next}>
          {current + 1 < questions.length ? 'Next question →' : 'See results'}
        </button>
      )}
    </div>
  );
}
