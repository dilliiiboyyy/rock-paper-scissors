import React from 'react';
import { Award, CheckCircle2, Lock, Play, RotateCcw, Trophy, XCircle } from 'lucide-react';
import { TournamentRecord, TournamentState } from '../types/game';

interface TournamentViewProps {
  tournament: TournamentState;
  pastTournaments: TournamentRecord[];
  onPlayCurrentStage: () => void;
  onStartNewTournament: () => void;
}

export const TournamentView: React.FC<TournamentViewProps> = ({
  tournament,
  pastTournaments,
  onPlayCurrentStage,
  onStartNewTournament,
}) => {
  const activeStage = tournament.stages[tournament.currentStageIndex];

  return (
    <main className="mx-auto max-w-[1380px] px-5 py-8 space-y-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="space-y-2">
          <div className="text-xs font-semibold text-[#55594D]">
            3-Stage Escalating Ladder · Streak Tracking
          </div>
          <h1 className="font-display text-3xl sm:text-4xl font-extrabold text-[#252820]">
            Arcade Championship Bracket
          </h1>
          <p className="max-w-2xl text-sm text-[#55594D]">
            Defeat the adaptive machine across three escalating stages. Each stage increases the
            AI’s N-gram depth and reaction speed.
          </p>
        </div>

        <button
          type="button"
          onClick={onStartNewTournament}
          className="tactile-btn inline-flex items-center gap-2 rounded-xl border-2 border-[#252820] bg-[#F8F3E8] px-4 py-2.5 text-xs font-bold text-[#252820] cursor-pointer"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          New Tournament
        </button>
      </div>

      {/* Champion / Elimination Banner */}
      {tournament.completed && (
        <section
          className={`tactile-card rounded-2xl p-6 flex flex-wrap items-center justify-between gap-4 ${
            tournament.champion ? 'bg-[#D6AA57]/30' : 'bg-[#D65D43]/15'
          }`}
        >
          <div className="flex items-center gap-4">
            {tournament.champion ? (
              <Award className="w-12 h-12 text-[#252820] shrink-0" />
            ) : (
              <XCircle className="w-12 h-12 text-[#D65D43] shrink-0" />
            )}
            <div>
              <h2 className="font-display text-2xl font-extrabold text-[#252820]">
                {tournament.champion ? 'Tournament Champion!' : 'Eliminated from the Bracket'}
              </h2>
              <p className="text-sm text-[#55594D]">
                {tournament.champion
                  ? `You swept all 3 stages against escalating AI adaptation with a best streak of ${tournament.bestStreak}.`
                  : 'The machine adapted first. Reset the bracket to challenge the ladder again.'}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onStartNewTournament}
            className="tactile-btn rounded-xl border-2 border-[#252820] bg-[#D65D43] px-5 py-3 text-xs font-bold text-[#F2EBDD] cursor-pointer"
          >
            Play Another Bracket
          </button>
        </section>
      )}

      {/* Stage Ladder */}
      <section className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {tournament.stages.map((stage) => {
          const isCurrent =
            !tournament.completed &&
            activeStage?.stageNumber === stage.stageNumber &&
            stage.status === 'active';

          return (
            <div
              key={stage.stageNumber}
              className={`tactile-card rounded-2xl p-5 flex flex-col justify-between gap-4 ${
                isCurrent ? 'bg-[#D6AA57]/20' : ''
              }`}
            >
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs font-semibold">
                  <span className="capitalize text-[#55594D]">{stage.difficulty} AI</span>
                  {stage.status === 'won' ? (
                    <span className="inline-flex items-center gap-1 text-[#87977A] font-bold">
                      <CheckCircle2 className="w-4 h-4" /> Cleared
                    </span>
                  ) : stage.status === 'lost' ? (
                    <span className="inline-flex items-center gap-1 text-[#D65D43] font-bold">
                      <XCircle className="w-4 h-4" /> Eliminated
                    </span>
                  ) : stage.status === 'locked' ? (
                    <span className="inline-flex items-center gap-1 text-[#55594D]">
                      <Lock className="w-3.5 h-3.5" /> Locked
                    </span>
                  ) : (
                    <span className="font-bold text-[#D65D43]">Active Bout</span>
                  )}
                </div>

                <h3 className="font-display text-lg font-bold text-[#252820]">{stage.title}</h3>
                <p className="text-xs text-[#55594D]">{stage.subtitle}</p>
              </div>

              <div className="border-t border-[#252820]/15 pt-3 flex items-center justify-between">
                <div className="font-mono-tabular text-xs text-[#55594D]">
                  {stage.status === 'won' || stage.status === 'lost'
                    ? `Final: You ${stage.playerScore} - ${stage.aiScore} AI`
                    : `Target: First to ${stage.targetWins}`}
                </div>

                {isCurrent && (
                  <button
                    type="button"
                    onClick={onPlayCurrentStage}
                    className="tactile-btn inline-flex items-center gap-1.5 rounded-lg border-2 border-[#252820] bg-[#D65D43] px-4 py-2 text-xs font-bold text-[#F2EBDD] cursor-pointer"
                  >
                    <Play className="w-3.5 h-3.5 fill-current" />
                    Enter Stage
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </section>

      {/* Past Tournament Records */}
      <section className="tactile-card rounded-2xl p-5 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="font-display text-lg font-bold text-[#252820]">Tournament Records</h2>
          <Trophy className="w-4 h-4 text-[#D6AA57]" />
        </div>

        {pastTournaments.length === 0 ? (
          <p className="text-xs text-[#55594D]">
            Complete a tournament bracket to record your championship history locally.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-[#252820]/20 text-[#55594D]">
                  <th className="py-2 pr-3 font-semibold">Date</th>
                  <th className="py-2 px-3 font-semibold">Outcome</th>
                  <th className="py-2 px-3 font-semibold font-mono-tabular">Stages Won</th>
                  <th className="py-2 px-3 font-semibold font-mono-tabular">Rounds</th>
                  <th className="py-2 pl-3 font-semibold font-mono-tabular">Best Streak</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#252820]/10 font-mono-tabular">
                {pastTournaments.map((t) => (
                  <tr key={t.id}>
                    <td className="py-2.5 pr-3 font-sans">
                      {new Date(t.completedAt).toLocaleString()}
                    </td>
                    <td className="py-2.5 px-3 font-sans font-bold">
                      {t.champion ? 'Champion' : 'Eliminated'}
                    </td>
                    <td className="py-2.5 px-3">{t.stagesWon} / 3</td>
                    <td className="py-2.5 px-3">{t.totalRounds}</td>
                    <td className="py-2.5 pl-3">{t.bestStreak}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </main>
  );
};
