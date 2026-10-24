'use client';

import ReactMarkdown from 'react-markdown';

interface DocumentaryOutputProps {
  raw: string;
  loading: boolean;
}

function StatBadge({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white border-2 border-[#1a1a1a] rounded-lg text-sm font-bold text-[#1a1a1a]">
      {children}
    </span>
  );
}

function DatePill({ date }: { date: string }) {
  return (
    <span className="inline-block shrink-0 px-2.5 py-1 bg-[#1a1a1a] text-white text-xs font-bold rounded-md uppercase tracking-wide">
      {date}
    </span>
  );
}

export default function DocumentaryOutput({ raw, loading }: DocumentaryOutputProps) {
  // Parse the raw documentary into structured sections
  const sections = parseDocumentary(raw);

  return (
    <div className="relative">
      <div className="absolute inset-0 bg-[#1a1a1a] rounded-2xl translate-x-1.5 translate-y-1.5" />
      <div className="relative bg-white border-2 border-[#1a1a1a] rounded-2xl overflow-hidden">
        {/* Top bar */}
        <div className="flex items-center justify-between px-5 py-3 bg-[#fff4da] border-b-2 border-[#1a1a1a]">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-[#ff6b00]" />
            <span className="text-sm font-bold text-[#1a1a1a]">Documentary</span>
          </div>
          {loading && (
            <span className="text-xs text-[#ff6b00] font-semibold animate-pulse">
              Generating...
            </span>
          )}
        </div>

        <div className="px-6 py-6 md:px-8 md:py-8 space-y-8">
          {/* Repo Title */}
          {sections.title && (
            <div>
              <h2 className="text-2xl md:text-3xl font-bold text-[#1a1a1a] mb-3">
                {sections.title}
              </h2>
              {sections.logline && (
                <p className="text-lg text-[#555] font-medium italic leading-snug">
                  &ldquo;{sections.logline}&rdquo;
                </p>
              )}
            </div>
          )}

          {/* Scale Stats */}
          {sections.stats && (
            <div className="flex flex-wrap gap-2">
              {sections.stats.map((stat, i) => (
                <StatBadge key={i}>{stat}</StatBadge>
              ))}
            </div>
          )}

          {/* Genesis */}
          {sections.genesis && sections.genesis.length > 0 && (
            <div>
              <h3 className="text-lg font-bold text-[#1a1a1a] mb-3 flex items-center gap-2">
                ⏳ The Genesis
              </h3>
              <div className="space-y-2">
                {sections.genesis.map((item, i) => (
                  <div key={i} className="flex gap-3 items-start">
                    <span className="text-[#ff6b00] mt-1 shrink-0">▸</span>
                    <p className="text-[#333] text-sm leading-relaxed">{item}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Turning Points Timeline */}
          {sections.turningPoints && sections.turningPoints.length > 0 && (
            <div>
              <h3 className="text-lg font-bold text-[#1a1a1a] mb-4 flex items-center gap-2">
                🔄 Turning Points
              </h3>
              <div className="relative ml-3">
                {/* Vertical line */}
                <div className="absolute left-0 top-2 bottom-2 w-0.5 bg-[#1a1a1a]/20" />
                <div className="space-y-4">
                  {sections.turningPoints.map((tp, i) => (
                    <div key={i} className="flex gap-4 items-start pl-4">
                      <div className="relative -ml-[21px] mt-1.5">
                        <div className="w-3 h-3 rounded-full bg-[#ff6b00] border-2 border-[#1a1a1a]" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1 flex-wrap">
                          <DatePill date={tp.date} />
                        </div>
                        <p className="text-[#333] text-sm leading-relaxed">
                          <strong className="text-[#1a1a1a]">{tp.event}:</strong>{' '}
                          {tp.detail}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Characters */}
          {sections.characters && sections.characters.length > 0 && (
            <div>
              <h3 className="text-lg font-bold text-[#1a1a1a] mb-3 flex items-center gap-2">
                👥 Characters
              </h3>
              <div className="space-y-2">
                {sections.characters.map((char, i) => (
                  <div key={i} className="flex gap-3 items-start">
                    <span className="text-[#ff6b00] mt-1 shrink-0">▸</span>
                    <p className="text-[#333] text-sm leading-relaxed">{char}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Eras */}
          {sections.eras && sections.eras.length > 0 && (
            <div>
              <h3 className="text-lg font-bold text-[#1a1a1a] mb-3 flex items-center gap-2">
                🗺️ Eras
              </h3>
              <div className="space-y-3">
                {sections.eras.map((era, i) => (
                  <div key={i} className="border-l-4 border-[#ff6b00] pl-4 py-1">
                    <p className="text-[#333] text-sm leading-relaxed">{era}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Butterfly Effect */}
          {sections.butterfly && (
            <div>
              <h3 className="text-lg font-bold text-[#1a1a1a] mb-3 flex items-center gap-2">
                🦋 Butterfly Effect
              </h3>
              <div className="bg-[#fff4da] border-2 border-[#1a1a1a] rounded-xl p-4">
                <p className="text-[#333] text-sm leading-relaxed">{sections.butterfly}</p>
              </div>
            </div>
          )}

          {/* Raw fallback for any remaining content */}
          {sections.remaining && (
            <div className="prose prose-sm max-w-none text-[#333] prose-headings:text-[#1a1a1a] prose-strong:text-[#1a1a1a]">
              <ReactMarkdown>{sections.remaining}</ReactMarkdown>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

interface TurningPoint {
  date: string;
  event: string;
  detail: string;
}

interface ParsedDocumentary {
  title: string | null;
  logline: string | null;
  stats: string[];
  genesis: string[];
  turningPoints: TurningPoint[];
  characters: string[];
  eras: string[];
  butterfly: string | null;
  remaining: string;
}

function parseDocumentary(raw: string): ParsedDocumentary {
  const lines = raw.split('\n');
  const result: ParsedDocumentary = {
    title: null,
    logline: null,
    stats: [],
    genesis: [],
    turningPoints: [],
    characters: [],
    eras: [],
    butterfly: null,
    remaining: '',
  };

  let currentSection = '';
  const remainingLines: string[] = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();

    const heading = trimmed.match(/^(#{1,6})\s+(.+)$/);
    if (heading) {
      const name = heading[2].replace(/^[^\p{L}\p{N}]+/u, '').trim();
      if (heading[1] === '#') {
        if (!result.title) result.title = heading[2];
        currentSection = 'story';
      } else if (/Genesis/i.test(name)) currentSection = 'genesis';
      else if (/Scale|Stats|Today/i.test(name)) currentSection = 'stats';
      else if (/Turning Point/i.test(name)) currentSection = 'turningPoints';
      else if (/Characters|People/i.test(name)) currentSection = 'characters';
      else if (/Eras?/i.test(name)) currentSection = 'eras';
      else if (/Butterfly/i.test(name)) currentSection = 'butterfly';
      else {
        currentSection = '';
        remainingLines.push(line);
      }
      continue;
    }

    if (!trimmed) {
      remainingLines.push(line);
      continue;
    }

    // Parse based on current section
    switch (currentSection) {
      case 'story': {
        if (!result.logline && !trimmed.startsWith('-') && !trimmed.startsWith('**')) {
          result.logline = trimmed.replace(/^['"]|['"]$/g, '');
        } else if (trimmed.includes('Stars:') || trimmed.includes('Forks:') || trimmed.includes('Issues:')) {
          result.stats.push(trimmed.replace(/\*\*/g, ''));
        } else {
          remainingLines.push(line);
        }
        break;
      }
      case 'genesis': {
        if (trimmed.startsWith('-') || trimmed.startsWith('•')) {
          const cleaned = trimmed.replace(/^[-•]\s*/, '').replace(/\*\*/g, '');
          if (cleaned) result.genesis.push(cleaned);
        } else if (trimmed) {
          result.genesis.push(trimmed);
        }
        break;
      }
      case 'stats': {
        if (trimmed) result.stats.push(trimmed.replace(/^[-•*]\s*/, '').replace(/\*\*/g, ''));
        break;
      }
      case 'turningPoints': {
        // Match patterns like: - **May 2013** — Event. Detail
        // or: - **May 2013** — Event: Detail
        const tpMatch = trimmed.match(/^[-•*]\s*\*\*([A-Z][a-z]+\s+\d{4})\*\*\s*[—–-]\s*(.+)/);
        if (tpMatch) {
          const date = tpMatch[1];
          const rest = tpMatch[2];
          // Split on first colon or period for event/detail
          const colonIdx = rest.indexOf(':');
          const periodIdx = rest.indexOf('. ');
          let event: string, detail: string;
          if (colonIdx > 0 && colonIdx < 60) {
            event = rest.substring(0, colonIdx);
            detail = rest.substring(colonIdx + 1).trim();
          } else if (periodIdx > 0 && periodIdx < 60) {
            event = rest.substring(0, periodIdx);
            detail = rest.substring(periodIdx + 2).trim();
          } else {
            event = rest;
            detail = '';
          }
          result.turningPoints.push({
            date,
            event: event.replace(/\*\*/g, '').trim(),
            detail: detail.replace(/\*\*/g, '').trim(),
          });
        } else {
          remainingLines.push(line);
        }
        break;
      }
      case 'characters': {
        if (trimmed.startsWith('-') || trimmed.startsWith('•')) {
          const cleaned = trimmed.replace(/^[-•]\s*/, '').replace(/\*\*/g, '');
          if (cleaned) result.characters.push(cleaned);
        }
        break;
      }
      case 'eras': {
        if (trimmed) {
          const cleaned = trimmed.replace(/\*\*/g, '').replace(/^[-•]\s*/, '');
          result.eras.push(cleaned);
        }
        break;
      }
      case 'butterfly': {
        if (trimmed && !result.butterfly) {
          result.butterfly = trimmed.replace(/\*\*/g, '');
        } else if (trimmed && result.butterfly) {
          result.butterfly += ' ' + trimmed.replace(/\*\*/g, '');
        }
        break;
      }
      default:
        remainingLines.push(line);
    }
  }

  result.remaining = remainingLines.join('\n').trim();
  return result;
}
