const test = require("node:test");
const assert = require("node:assert/strict");

const {
  resolveWorkoutOfDay,
  resolveActiveSeason,
  resolveWeekForDate,
} = require("../src/selectors/calendar.cjs");

const baseWorkouts = [
  {
    workoutId: "workout-a",
    version: 1,
    status: "published",
    tiers: {
      MED: { name: "A MED", structure: [] },
      LRG: { name: "A LRG", structure: [] },
      XL: { name: "A XL", structure: [] },
    },
  },
  {
    workoutId: "workout-b",
    version: 1,
    status: "published",
    tiers: {
      MED: { name: "B MED", structure: [] },
      LRG: { name: "B LRG", structure: [] },
    },
  },
  {
    workoutId: "workout-draft",
    version: 1,
    status: "draft",
    tiers: {
      MED: { name: "Draft MED", structure: [] },
      LRG: { name: "Draft LRG", structure: [] },
      XL: { name: "Draft XL", structure: [] },
    },
  },
];

function buildCalendarData(overrides = {}) {
  return {
    seasons: [
      {
        seasonId: "season-test",
        name: "Test Season",
        startDate: "2026-01-26",
        endDate: "2026-02-08",
        timezone: "America/Los_Angeles",
        weekIds: ["week-1", "week-2"],
      },
    ],
    blocks: [
      {
        blockId: "block-a",
        name: "Block A",
        intent: "Base",
        weekIds: ["week-1"],
      },
      {
        blockId: "block-b",
        name: "Block B",
        intent: "Build",
        weekIds: ["week-2"],
      },
    ],
    weeks: [
      {
        weekId: "week-1",
        seasonId: "season-test",
        blockId: "block-a",
        startDate: "2026-01-26",
        workouts: {
          mon: "workout-a@v1",
          tue: null,
          wed: "workout-b@v1",
          thu: null,
          fri: null,
          sat: "workout-a@v1",
          sun: "workout-b@v1",
        },
      },
      {
        weekId: "week-2",
        seasonId: "season-test",
        blockId: "block-b",
        startDate: "2026-02-02",
        workouts: {
          mon: "workout-a@v1",
          tue: null,
          wed: "workout-b@v1",
          thu: null,
          fri: null,
          sat: "workout-a@v1",
          sun: "workout-b@v1",
        },
      },
    ],
    workouts: baseWorkouts,
    ...overrides,
  };
}

test("resolveActiveSeason selects season by Pacific date range", () => {
  const data = buildCalendarData();
  const season = resolveActiveSeason(
    data.seasons,
    new Date("2026-02-01T12:00:00-08:00")
  );
  assert.equal(season?.seasonId, "season-test");
  const none = resolveActiveSeason(
    data.seasons,
    new Date("2026-01-20T12:00:00-08:00")
  );
  assert.equal(none, null);
});

test("resolveWeekForDate transitions weeks on Monday", () => {
  const data = buildCalendarData();
  const season = data.seasons[0];
  const sunday = resolveWeekForDate(
    season,
    data.weeks,
    new Date("2026-02-01T12:00:00-08:00")
  );
  const monday = resolveWeekForDate(
    season,
    data.weeks,
    new Date("2026-02-02T12:00:00-08:00")
  );
  assert.equal(sunday?.week.weekId, "week-1");
  assert.equal(monday?.week.weekId, "week-2");
});

test("resolveWorkoutOfDay returns null for rest days", () => {
  const data = buildCalendarData();
  const result = resolveWorkoutOfDay(
    data,
    new Date("2026-02-03T12:00:00-08:00")
  );
  assert.equal(result, null);
});

test("resolveWorkoutOfDay returns tier fallbacks when tiers are missing", () => {
  const data = buildCalendarData();
  const result = resolveWorkoutOfDay(
    data,
    new Date("2026-02-01T12:00:00-08:00")
  );
  assert.equal(result?.workout.workoutId, "workout-b");
  assert.equal(result?.tierSources.MED, "MED");
  assert.equal(result?.tierSources.LRG, "LRG");
  assert.equal(result?.tierSources.XL, "LRG");
});

test("resolveWorkoutOfDay ignores draft workouts", () => {
  const data = buildCalendarData({
    weeks: [
      {
        weekId: "week-1",
        seasonId: "season-test",
        blockId: "block-a",
        startDate: "2026-01-26",
        workouts: {
          mon: "workout-draft@v1",
          tue: null,
          wed: null,
          thu: null,
          fri: null,
          sat: null,
          sun: null,
        },
      },
    ],
    seasons: [
      {
        seasonId: "season-test",
        name: "Test Season",
        startDate: "2026-01-26",
        endDate: "2026-02-01",
        timezone: "America/Los_Angeles",
        weekIds: ["week-1"],
      },
    ],
    blocks: [
      {
        blockId: "block-a",
        name: "Block A",
        intent: "Base",
        weekIds: ["week-1"],
      },
    ],
  });

  assert.throws(() => {
    resolveWorkoutOfDay(data, new Date("2026-01-26T12:00:00-08:00"));
  }, /not found or is draft/i);
});

test("resolveWorkoutOfDay handles DST transitions in America/Los_Angeles", () => {
  const data = buildCalendarData({
    seasons: [
      {
        seasonId: "season-dst",
        name: "DST Season",
        startDate: "2026-03-02",
        endDate: "2026-03-15",
        timezone: "America/Los_Angeles",
        weekIds: ["week-dst-1", "week-dst-2"],
      },
    ],
    blocks: [
      {
        blockId: "block-dst",
        name: "DST Block",
        intent: "DST Coverage",
        weekIds: ["week-dst-1", "week-dst-2"],
      },
    ],
    weeks: [
      {
        weekId: "week-dst-1",
        seasonId: "season-dst",
        blockId: "block-dst",
        startDate: "2026-03-02",
        workouts: {
          mon: null,
          tue: null,
          wed: null,
          thu: null,
          fri: null,
          sat: null,
          sun: "workout-a@v1",
        },
      },
      {
        weekId: "week-dst-2",
        seasonId: "season-dst",
        blockId: "block-dst",
        startDate: "2026-03-09",
        workouts: {
          mon: "workout-a@v1",
          tue: null,
          wed: null,
          thu: null,
          fri: null,
          sat: null,
          sun: null,
        },
      },
    ],
  });

  const sunday = resolveWorkoutOfDay(
    data,
    new Date("2026-03-08T12:00:00-07:00")
  );
  assert.equal(sunday?.week.weekId, "week-dst-1");
  assert.equal(sunday?.workout.workoutId, "workout-a");
});
