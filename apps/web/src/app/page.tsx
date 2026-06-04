const participants = [
  { name: "Mara", role: "required", status: "Available" },
  { name: "Simon", role: "required", status: "Available" },
  { name: "Lea", role: "optional", status: "Conflict" },
  { name: "Jonas", role: "optional", status: "Available" },
];

const suggestions = [
  {
    time: "Tue 09:30",
    duration: "45 min",
    score: 92,
    reason: "2 required, 1 optional, Room A fits",
  },
  {
    time: "Tue 14:00",
    duration: "45 min",
    score: 84,
    reason: "All required, lower resource fit",
  },
  {
    time: "Wed 10:15",
    duration: "45 min",
    score: 78,
    reason: "All participants, fragments focus time",
  },
];

export default function Home() {
  return (
    <main className="min-h-screen bg-[#f6f7f9] text-[#1d2430]">
      <header className="border-b border-[#d9dee7] bg-white">
        <div className="mx-auto flex max-w-7xl flex-col gap-4 px-5 py-4 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-sm font-medium text-[#4d6b5f]">Scheduling App</p>
            <h1 className="text-2xl font-semibold">Team calendar planning</h1>
          </div>
          <button className="h-10 w-full rounded-md bg-[#1f6f5b] px-4 text-sm font-semibold text-white md:w-auto">
            New event request
          </button>
        </div>
      </header>

      <div className="mx-auto grid max-w-7xl gap-5 px-5 py-5 lg:grid-cols-[360px_1fr]">
        <section className="rounded-lg border border-[#d9dee7] bg-white p-4">
          <div className="mb-4 flex items-start justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold">Event request</h2>
              <p className="text-sm text-[#687385]">Workshop planning slot</p>
            </div>
            <span className="rounded-md bg-[#e8f3ee] px-2 py-1 text-xs font-semibold text-[#1f6f5b]">
              Offline
            </span>
          </div>

          <div className="grid gap-3 text-sm">
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-md border border-[#d9dee7] p-3">
                <p className="text-[#687385]">Duration</p>
                <p className="font-semibold">45 min</p>
              </div>
              <div className="rounded-md border border-[#d9dee7] p-3">
                <p className="text-[#687385]">Priority</p>
                <p className="font-semibold">High</p>
              </div>
            </div>

            <div className="rounded-md border border-[#d9dee7] p-3">
              <p className="mb-2 text-[#687385]">Constraints</p>
              <div className="flex flex-wrap gap-2">
                <span className="rounded bg-[#eef1f5] px-2 py-1">8 seats</span>
                <span className="rounded bg-[#eef1f5] px-2 py-1">
                  Whiteboard
                </span>
                <span className="rounded bg-[#eef1f5] px-2 py-1">Screen</span>
              </div>
            </div>

            <div className="rounded-md border border-[#d9dee7] p-3">
              <p className="mb-2 text-[#687385]">Participants</p>
              <div className="grid gap-2">
                {participants.map((participant) => (
                  <div
                    className="flex items-center justify-between gap-3"
                    key={participant.name}
                  >
                    <div>
                      <p className="font-medium">{participant.name}</p>
                      <p className="text-xs capitalize text-[#687385]">
                        {participant.role}
                      </p>
                    </div>
                    <span
                      className={
                        participant.status === "Available"
                          ? "rounded bg-[#e8f3ee] px-2 py-1 text-xs font-medium text-[#1f6f5b]"
                          : "rounded bg-[#fff0df] px-2 py-1 text-xs font-medium text-[#9a5a0a]"
                      }
                    >
                      {participant.status}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section className="grid gap-5">
          <div className="rounded-lg border border-[#d9dee7] bg-white p-4">
            <div className="mb-4 flex items-center justify-between gap-3">
              <div>
                <h2 className="text-lg font-semibold">Best slots</h2>
                <p className="text-sm text-[#687385]">
                  Ranked by hard constraints and scoring signals
                </p>
              </div>
              <span className="rounded-md border border-[#d9dee7] px-2 py-1 text-xs font-semibold">
                3 valid
              </span>
            </div>

            <div className="grid gap-3">
              {suggestions.map((suggestion) => (
                <div
                  className="grid gap-3 rounded-md border border-[#d9dee7] p-3 md:grid-cols-[120px_1fr_72px]"
                  key={suggestion.time}
                >
                  <div>
                    <p className="font-semibold">{suggestion.time}</p>
                    <p className="text-sm text-[#687385]">
                      {suggestion.duration}
                    </p>
                  </div>
                  <p className="text-sm text-[#3c4656]">{suggestion.reason}</p>
                  <div className="flex items-center justify-start md:justify-end">
                    <span className="rounded-md bg-[#253247] px-2 py-1 text-sm font-semibold text-white">
                      {suggestion.score}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="grid gap-5 md:grid-cols-2">
            <div className="rounded-lg border border-[#d9dee7] bg-white p-4">
              <h2 className="mb-3 text-lg font-semibold">Hard constraints</h2>
              <ul className="space-y-2 text-sm text-[#3c4656]">
                <li>Required participants must be available.</li>
                <li>Offline events need a fitting room.</li>
                <li>Room capacity and required features must match.</li>
              </ul>
            </div>
            <div className="rounded-lg border border-[#d9dee7] bg-white p-4">
              <h2 className="mb-3 text-lg font-semibold">Scoring signals</h2>
              <ul className="space-y-2 text-sm text-[#3c4656]">
                <li>Optional participant availability improves the score.</li>
                <li>High-priority events prefer stronger slots.</li>
                <li>Fragmented focus time is penalized.</li>
              </ul>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
