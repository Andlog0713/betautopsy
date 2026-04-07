import type { AutopsyAnalysis, ReportComparison, ScoreDelta, BiasChange, DeltaDirection } from '@/types';

const SEVERITY_ORDER: Record<string, number> = { low: 1, medium: 2, high: 3, critical: 4 };
const GRADE_VALUES: Record<string, number> = { A: 4, B: 3, C: 2, D: 1, F: 0 };

function direction(delta: number): DeltaDirection {
  if (delta > 0) return 'up';
  if (delta < 0) return 'down';
  return 'flat';
}

function scoreDelta(current: number, previous: number): ScoreDelta {
  const delta = Math.round(current - previous);
  return { current, previous, delta, direction: direction(delta) };
}

function avgGrade(dist: { grade: string; count: number }[]): number {
  let total = 0;
  let count = 0;
  for (const d of dist) {
    const val = GRADE_VALUES[d.grade.toUpperCase()];
    if (val !== undefined) {
      total += val * d.count;
      count += d.count;
    }
  }
  return count > 0 ? total / count : 0;
}

export function compareReports(current: AutopsyAnalysis, previous: AutopsyAnalysis): ReportComparison {
  // Scores
  const emotionScore = scoreDelta(
    current.emotion_score ?? current.tilt_score ?? 0,
    previous.emotion_score ?? previous.tilt_score ?? 0
  );

  const disciplineScore = current.discipline_score && previous.discipline_score
    ? scoreDelta(current.discipline_score.total, previous.discipline_score.total)
    : null;

  const betiqScore = current.betiq && previous.betiq
    ? scoreDelta(current.betiq.score, previous.betiq.score)
    : null;

  // Bias changes
  const prevBiasMap: Record<string, typeof previous.biases_detected[0]> = {};
  previous.biases_detected.forEach(b => { prevBiasMap[b.bias_name.toLowerCase()] = b; });
  const currBiasMap: Record<string, typeof current.biases_detected[0]> = {};
  current.biases_detected.forEach(b => { currBiasMap[b.bias_name.toLowerCase()] = b; });
  const biasChanges: BiasChange[] = [];

  Object.entries(currBiasMap).forEach(([key, curr]) => {
    const prev = prevBiasMap[key];
    if (!prev) {
      biasChanges.push({ name: curr.bias_name, previousSeverity: null, currentSeverity: curr.severity, direction: 'new' });
    } else {
      const prevSev = SEVERITY_ORDER[prev.severity] ?? 0;
      const currSev = SEVERITY_ORDER[curr.severity] ?? 0;
      if (currSev < prevSev) {
        biasChanges.push({ name: curr.bias_name, previousSeverity: prev.severity, currentSeverity: curr.severity, direction: 'improved' });
      } else if (currSev > prevSev) {
        biasChanges.push({ name: curr.bias_name, previousSeverity: prev.severity, currentSeverity: curr.severity, direction: 'worsened' });
      }
    }
  });
  Object.entries(prevBiasMap).forEach(([key, prev]) => {
    if (!currBiasMap[key]) {
      biasChanges.push({ name: prev.bias_name, previousSeverity: prev.severity, currentSeverity: null, direction: 'resolved' });
    }
  });

  // Session grade shift
  const currDist = current.session_detection?.sessionGradeDistribution ?? current._snapshot_teaser?.sessionGrades
    ? Object.entries(current._snapshot_teaser?.sessionGrades ?? {}).map(([grade, count]) => ({ grade, count }))
    : null;
  const prevDist = previous.session_detection?.sessionGradeDistribution ?? previous._snapshot_teaser?.sessionGrades
    ? Object.entries(previous._snapshot_teaser?.sessionGrades ?? {}).map(([grade, count]) => ({ grade, count }))
    : null;

  const sessionGradeShift = (current.session_detection?.sessionGradeDistribution && previous.session_detection?.sessionGradeDistribution)
    ? (() => {
        const currentAvg = avgGrade(current.session_detection!.sessionGradeDistribution);
        const previousAvg = avgGrade(previous.session_detection!.sessionGradeDistribution);
        return { currentAvg, previousAvg, direction: direction(currentAvg - previousAvg) };
      })()
    : null;

  // Heated sessions
  const currHeated = current.session_detection?.heatedSessionCount ?? current._snapshot_teaser?.heatedSessionCount;
  const prevHeated = previous.session_detection?.heatedSessionCount ?? previous._snapshot_teaser?.heatedSessionCount;
  const heatedSessionChange = (currHeated !== undefined && prevHeated !== undefined)
    ? { current: currHeated, previous: prevHeated, delta: currHeated - prevHeated, direction: direction(prevHeated - currHeated) as DeltaDirection }
    : null;

  // Top improvement / regression
  const improvements: { label: string; magnitude: number }[] = [];
  const regressions: { label: string; magnitude: number }[] = [];

  // Emotion: lower is better
  if (emotionScore.delta < 0) improvements.push({ label: `Emotion Score dropped ${Math.abs(emotionScore.delta)} points (less emotional betting)`, magnitude: Math.abs(emotionScore.delta) });
  else if (emotionScore.delta > 0) regressions.push({ label: `Emotion Score rose ${emotionScore.delta} points (more emotional betting)`, magnitude: emotionScore.delta });

  // Discipline: higher is better
  if (disciplineScore?.delta && disciplineScore.delta > 0) improvements.push({ label: `Discipline Score improved ${disciplineScore.delta} points`, magnitude: disciplineScore.delta });
  else if (disciplineScore?.delta && disciplineScore.delta < 0) regressions.push({ label: `Discipline Score dropped ${Math.abs(disciplineScore.delta)} points`, magnitude: Math.abs(disciplineScore.delta) });

  // BetIQ: higher is better
  if (betiqScore?.delta && betiqScore.delta > 0) improvements.push({ label: `BetIQ improved ${betiqScore.delta} points`, magnitude: betiqScore.delta });
  else if (betiqScore?.delta && betiqScore.delta < 0) regressions.push({ label: `BetIQ dropped ${Math.abs(betiqScore.delta)} points`, magnitude: Math.abs(betiqScore.delta) });

  // Biases resolved
  const resolved = biasChanges.filter(b => b.direction === 'resolved');
  if (resolved.length > 0) improvements.push({ label: `${resolved[0].name} resolved`, magnitude: 20 });

  // Biases worsened severity
  for (const b of biasChanges) {
    if (b.direction === 'improved') improvements.push({ label: `${b.name} severity dropped from ${capitalize(b.previousSeverity!)} to ${capitalize(b.currentSeverity!)}`, magnitude: 15 });
    if (b.direction === 'worsened') regressions.push({ label: `${b.name} severity rose from ${capitalize(b.previousSeverity!)} to ${capitalize(b.currentSeverity!)}`, magnitude: 15 });
    if (b.direction === 'new') regressions.push({ label: `New bias detected: ${b.name}`, magnitude: 10 });
  }

  // Heated sessions: fewer is better
  if (heatedSessionChange && heatedSessionChange.delta < 0) improvements.push({ label: `Heated sessions dropped from ${heatedSessionChange.previous} to ${heatedSessionChange.current}`, magnitude: Math.abs(heatedSessionChange.delta) * 10 });
  else if (heatedSessionChange && heatedSessionChange.delta > 0) regressions.push({ label: `Heated sessions increased from ${heatedSessionChange.previous} to ${heatedSessionChange.current}`, magnitude: heatedSessionChange.delta * 10 });

  improvements.sort((a, b) => b.magnitude - a.magnitude);
  regressions.sort((a, b) => b.magnitude - a.magnitude);

  return {
    emotionScore,
    disciplineScore,
    betiqScore,
    biasChanges,
    sessionGradeShift,
    heatedSessionChange,
    topImprovement: improvements[0]?.label ?? null,
    topRegression: regressions[0]?.label ?? null,
  };
}

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}
