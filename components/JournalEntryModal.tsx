'use client';

import { useState } from 'react';
import type { JournalEntryInput } from '@/types';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSaved?: () => void;
}

const EMOTIONAL_STATES = [
  { value: 'calm', label: 'Calm', icon: '🧊' },
  { value: 'confident', label: 'Confident', icon: '💪' },
  { value: 'excited', label: 'Excited', icon: '⚡' },
  { value: 'bored', label: 'Bored', icon: '😐' },
  { value: 'anxious', label: 'Anxious', icon: '😰' },
  { value: 'frustrated', label: 'Frustrated', icon: '😤' },
] as const;

const RESEARCH_TIMES = [
  { value: 'none', label: 'None' },
  { value: 'under_5', label: '< 5 min' },
  { value: '5_to_15', label: '5-15 min' },
  { value: '15_to_30', label: '15-30 min' },
  { value: 'over_30', label: '30+ min' },
] as const;

export default function JournalEntryModal({ isOpen, onClose, onSaved }: Props) {
  const [confidence, setConfidence] = useState(3);
  const [emotionalState, setEmotionalState] = useState<JournalEntryInput['emotional_state']>('calm');
  const [researchTime, setResearchTime] = useState<JournalEntryInput['research_time']>('under_5');
  const [hadAlcohol, setHadAlcohol] = useState(false);
  const [timePressure, setTimePressure] = useState(false);
  const [chasingLosses, setChasingLosses] = useState(false);
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  if (!isOpen) return null;

  async function handleSave() {
    setSaving(true);
    setError('');

    try {
      const res = await fetch('/api/journal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          confidence,
          emotional_state: emotionalState,
          research_time: researchTime,
          had_alcohol: hadAlcohol,
          time_pressure: timePressure,
          chasing_losses: chasingLosses,
          notes: notes || undefined,
        } satisfies JournalEntryInput),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to save');
      }

      setConfidence(3);
      setEmotionalState('calm');
      setResearchTime('under_5');
      setHadAlcohol(false);
      setTimePressure(false);
      setChasingLosses(false);
      setNotes('');

      onSaved?.();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-base/80" onClick={onClose} />

      <div className="relative bg-surface border border-white/[0.06] rounded-sm w-full max-w-md max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/[0.04]">
          <div>
            <div className="case-header">PRE-BET CHECK-IN</div>
            <p className="text-fg-muted text-xs font-mono mt-1">Log your state before you bet. 30 seconds.</p>
          </div>
          <button onClick={onClose} className="text-fg-dim hover:text-fg transition-colors text-lg leading-none">&times;</button>
        </div>

        <div className="p-5 space-y-5">
          {/* Confidence */}
          <div>
            <label className="label">Confidence level</label>
            <div className="flex gap-2">
              {[1, 2, 3, 4, 5].map(n => (
                <button
                  key={n}
                  onClick={() => setConfidence(n)}
                  className={`flex-1 py-2 font-mono text-sm rounded-sm border transition-colors ${
                    confidence === n
                      ? 'border-scalpel/40 bg-scalpel-muted text-scalpel font-bold'
                      : 'border-white/[0.06] bg-surface-raised text-fg-dim hover:border-white/[0.1]'
                  }`}
                >
                  {n}
                </button>
              ))}
            </div>
            <div className="flex justify-between mt-1">
              <span className="font-mono text-xs text-fg-muted">GUESSING</span>
              <span className="font-mono text-xs text-fg-muted">LOCKED IN</span>
            </div>
          </div>

          {/* Emotional state */}
          <div>
            <label className="label">How are you feeling?</label>
            <div className="grid grid-cols-3 gap-2">
              {EMOTIONAL_STATES.map(state => (
                <button
                  key={state.value}
                  onClick={() => setEmotionalState(state.value as JournalEntryInput['emotional_state'])}
                  className={`py-2 px-3 text-xs rounded-sm border transition-colors text-center ${
                    emotionalState === state.value
                      ? 'border-scalpel/40 bg-scalpel-muted text-scalpel font-medium'
                      : 'border-white/[0.06] bg-surface-raised text-fg-dim hover:border-white/[0.1]'
                  }`}
                >
                  <span className="text-base block mb-0.5">{state.icon}</span>
                  {state.label}
                </button>
              ))}
            </div>
          </div>

          {/* Research time */}
          <div>
            <label className="label">Research time on this bet</label>
            <div className="flex gap-1.5 flex-wrap">
              {RESEARCH_TIMES.map(t => (
                <button
                  key={t.value}
                  onClick={() => setResearchTime(t.value as JournalEntryInput['research_time'])}
                  className={`py-1.5 px-3 font-mono text-xs rounded-sm border transition-colors ${
                    researchTime === t.value
                      ? 'border-scalpel/40 bg-scalpel-muted text-scalpel'
                      : 'border-white/[0.06] bg-surface-raised text-fg-dim hover:border-white/[0.1]'
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>
          </div>

          {/* Context toggles */}
          <div>
            <label className="label">Context flags</label>
            <div className="space-y-2">
              {[
                { value: hadAlcohol, setter: setHadAlcohol, label: 'Had alcohol', icon: '🍺' },
                { value: timePressure, setter: setTimePressure, label: 'Feeling time pressure', icon: '⏰' },
                { value: chasingLosses, setter: setChasingLosses, label: 'Chasing a loss', icon: '🔥' },
              ].map(toggle => (
                <button
                  key={toggle.label}
                  onClick={() => toggle.setter(!toggle.value)}
                  className={`w-full flex items-center gap-3 py-2 px-3 rounded-sm border text-left text-sm transition-colors ${
                    toggle.value
                      ? 'border-bleed/30 bg-bleed-muted text-bleed'
                      : 'border-white/[0.06] bg-surface-raised text-fg-dim hover:border-white/[0.1]'
                  }`}
                >
                  <span>{toggle.icon}</span>
                  <span>{toggle.label}</span>
                  <span className="ml-auto font-mono text-xs">{toggle.value ? 'YES' : 'NO'}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="label">Notes (optional)</label>
            <textarea
              value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder="Any context — what game, why this bet, how you're feeling..."
              className="input-field w-full h-20 resize-none text-sm"
              maxLength={500}
            />
          </div>

          {error && <p className="text-bleed text-sm font-mono">{error}</p>}

          <button
            onClick={handleSave}
            disabled={saving}
            className="btn-primary w-full font-mono text-sm"
          >
            {saving ? 'Saving...' : 'Log Entry'}
          </button>

          <p className="text-fg-muted text-xs text-center leading-relaxed">
            After 30+ entries, BetAutopsy will correlate your mental state with your actual results. Showing which emotions and contexts cost you money.
          </p>
        </div>
      </div>
    </div>
  );
}
