const DEFAULT_TIME_ZONE = "America/Los_Angeles";
const DAY_KEYS = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"];
const WEEKDAY_TO_KEY = {
  Mon: "mon",
  Tue: "tue",
  Wed: "wed",
  Thu: "thu",
  Fri: "fri",
  Sat: "sat",
  Sun: "sun",
};

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

function getZonedDateParts(date, timeZone) {
  assert(date instanceof Date && !Number.isNaN(date.valueOf()), "Invalid date.");
  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    weekday: "short",
  });
  const parts = formatter.formatToParts(date);
  const lookup = {};
  for (const part of parts) {
    if (part.type !== "literal") {
      lookup[part.type] = part.value;
    }
  }
  return {
    year: Number(lookup.year),
    month: Number(lookup.month),
    day: Number(lookup.day),
    weekday: lookup.weekday,
  };
}

function formatCivilDate({ year, month, day }) {
  const yyyy = String(year).padStart(4, "0");
  const mm = String(month).padStart(2, "0");
  const dd = String(day).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

function toCivilDateString(date, timeZone) {
  return formatCivilDate(getZonedDateParts(date, timeZone));
}

function civilDateToEpochMs(civilDate) {
  const [year, month, day] = civilDate.split("-").map((part) => Number(part));
  assert(
    Number.isInteger(year) && Number.isInteger(month) && Number.isInteger(day),
    `Invalid civil date: ${civilDate}`
  );
  return Date.UTC(year, month - 1, day);
}

function addDaysToCivilDate(civilDate, days) {
  const ms = civilDateToEpochMs(civilDate);
  const next = new Date(ms + days * 24 * 60 * 60 * 1000);
  return formatCivilDate({
    year: next.getUTCFullYear(),
    month: next.getUTCMonth() + 1,
    day: next.getUTCDate(),
  });
}

function weekdayForCivilDate(civilDate, timeZone) {
  const [year, month, day] = civilDate.split("-").map((part) => Number(part));
  const date = new Date(Date.UTC(year, month - 1, day, 12, 0, 0));
  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone,
    weekday: "short",
  });
  return formatter.format(date);
}

function dayKeyForDate(date, timeZone) {
  const parts = getZonedDateParts(date, timeZone);
  const key = WEEKDAY_TO_KEY[parts.weekday];
  assert(Boolean(key), `Unsupported weekday value: ${parts.weekday}`);
  return key;
}

function assertWeekWorkoutsShape(week) {
  assert(week && typeof week === "object", "Week must be an object.");
  const workouts = week.workouts;
  assert(workouts && typeof workouts === "object", "week.workouts must be an object.");
  const keys = Object.keys(workouts);
  assert(keys.length === DAY_KEYS.length, "week.workouts must have exactly 7 day keys.");
  for (const key of DAY_KEYS) {
    assert(key in workouts, `week.workouts.${key} is missing.`);
  }
  for (const key of keys) {
    assert(DAY_KEYS.includes(key), `week.workouts has invalid key: ${key}`);
  }
}

function parseWorkoutRef(value) {
  const match = value.match(/^([a-z0-9-]+)@v([1-9][0-9]*)$/);
  if (!match) {
    throw new Error(`Invalid workout reference: ${value}`);
  }
  return { workoutId: match[1], version: Number(match[2]) };
}

function resolveTierVariant(workout, tier) {
  const tiers = workout?.tiers ?? {};
  const fallbackOrder = {
    MED: ["MED", "LRG", "XL"],
    LRG: ["LRG", "MED", "XL"],
    XL: ["XL", "LRG", "MED"],
  };
  const candidates = fallbackOrder[tier] || ["MED", "LRG", "XL"];
  for (const key of candidates) {
    if (tiers[key]) {
      return { variant: tiers[key], sourceTier: key };
    }
  }
  throw new Error(`Workout ${workout?.workoutId ?? "unknown"} has no tier variants.`);
}

function resolveWorkoutByVersion(workouts, workoutId, version) {
  const match = workouts.find(
    (workout) =>
      workout.workoutId === workoutId &&
      workout.version === version &&
      workout.status !== "draft"
  );
  return match || null;
}

function resolveActiveSeason(seasons, date, timeZone = DEFAULT_TIME_ZONE) {
  assert(Array.isArray(seasons), "seasons must be an array.");
  const dateStr = toCivilDateString(date, timeZone);
  const dateMs = civilDateToEpochMs(dateStr);

  const candidates = seasons.filter((season) => {
    assert(
      season.timezone === timeZone,
      `Season ${season.seasonId} must use timezone ${timeZone}.`
    );
    const startMs = civilDateToEpochMs(season.startDate);
    const endMs = civilDateToEpochMs(season.endDate);
    return dateMs >= startMs && dateMs <= endMs;
  });

  if (candidates.length === 0) {
    return null;
  }

  return candidates.reduce((latest, current) => {
    const latestStart = civilDateToEpochMs(latest.startDate);
    const currentStart = civilDateToEpochMs(current.startDate);
    return currentStart >= latestStart ? current : latest;
  });
}

function resolveWeekForDate(season, weeks, date, timeZone = DEFAULT_TIME_ZONE) {
  if (!season) return null;
  assert(Array.isArray(weeks), "weeks must be an array.");
  assert(Array.isArray(season.weekIds), "season.weekIds must be an array.");

  const dateStr = toCivilDateString(date, timeZone);
  const dateMs = civilDateToEpochMs(dateStr);

  const weekLookup = new Map(weeks.map((week) => [week.weekId, week]));
  const orderedWeeks = season.weekIds.map((weekId) => {
    const week = weekLookup.get(weekId);
    assert(week, `Week ${weekId} not found in weeks data.`);
    return week;
  });

  for (let index = 0; index < orderedWeeks.length; index += 1) {
    const week = orderedWeeks[index];
    const startMs = civilDateToEpochMs(week.startDate);
    const endMs = civilDateToEpochMs(addDaysToCivilDate(week.startDate, 6));
    if (dateMs >= startMs && dateMs <= endMs) {
      const weekday = weekdayForCivilDate(week.startDate, timeZone);
      assert(weekday === "Mon", `Week ${week.weekId} must start on Monday.`);
      return { week, index };
    }
  }

  return null;
}

function resolveWorkoutOfDay(data, date, options = {}) {
  const timeZone = options.timeZone ?? DEFAULT_TIME_ZONE;
  assert(data && typeof data === "object", "data is required.");
  const { seasons = [], blocks = [], weeks = [], workouts = [] } = data;

  const season = resolveActiveSeason(seasons, date, timeZone);
  if (!season) return null;

  const resolvedWeek = resolveWeekForDate(season, weeks, date, timeZone);
  if (!resolvedWeek) return null;

  const { week, index } = resolvedWeek;
  assertWeekWorkoutsShape(week);

  const dayKey = dayKeyForDate(date, timeZone);
  const workoutRef = week.workouts[dayKey];
  if (workoutRef === null) {
    return null;
  }
  assert(typeof workoutRef === "string", `week.workouts.${dayKey} must be string or null.`);

  const { workoutId, version } = parseWorkoutRef(workoutRef);
  const workout = resolveWorkoutByVersion(workouts, workoutId, version);
  assert(
    workout,
    `Workout ${workoutId}@v${version} not found or is draft.`
  );

  const block = blocks.find((entry) => entry.blockId === week.blockId);
  assert(block, `Block ${week.blockId} not found in blocks data.`);

  const tiers = {
    MED: resolveTierVariant(workout, "MED"),
    LRG: resolveTierVariant(workout, "LRG"),
    XL: resolveTierVariant(workout, "XL"),
  };

  return {
    workout,
    tiers: {
      MED: tiers.MED.variant,
      LRG: tiers.LRG.variant,
      XL: tiers.XL.variant,
    },
    tierSources: {
      MED: tiers.MED.sourceTier,
      LRG: tiers.LRG.sourceTier,
      XL: tiers.XL.sourceTier,
    },
    block: {
      blockId: block.blockId,
      name: block.name,
      intent: block.intent,
    },
    week: {
      weekId: week.weekId,
      index,
      startDate: week.startDate,
    },
  };
}

function assertCalendarData(data, options = {}) {
  const timeZone = options.timeZone ?? DEFAULT_TIME_ZONE;
  assert(data && typeof data === "object", "data is required.");
  const { seasons = [], blocks = [], weeks = [], workouts = [] } = data;

  assert(Array.isArray(seasons), "seasons must be an array.");
  assert(Array.isArray(blocks), "blocks must be an array.");
  assert(Array.isArray(weeks), "weeks must be an array.");
  assert(Array.isArray(workouts), "workouts must be an array.");

  const seasonById = new Map(seasons.map((season) => [season.seasonId, season]));
  const weekById = new Map(weeks.map((week) => [week.weekId, week]));
  const workoutKey = (workout) => `${workout.workoutId}@v${workout.version}`;
  const workoutByKey = new Map(
    workouts
      .filter((workout) => workout.status !== "draft")
      .map((workout) => [workoutKey(workout), workout])
  );

  for (const season of seasons) {
    assert(
      season.timezone === timeZone,
      `Season ${season.seasonId} must use timezone ${timeZone}.`
    );
    assert(Array.isArray(season.weekIds), `Season ${season.seasonId} weekIds must be an array.`);
    assert(season.weekIds.length >= 1, `Season ${season.seasonId} must include at least one week.`);

    const weekStartDates = season.weekIds.map((weekId) => {
      const week = weekById.get(weekId);
      assert(week, `Week ${weekId} not found in weeks data.`);
      assert(
        week.seasonId === season.seasonId,
        `Week ${weekId} seasonId must match season ${season.seasonId}.`
      );
      return week.startDate;
    });

    for (let i = 1; i < weekStartDates.length; i += 1) {
      assert(
        weekStartDates[i - 1] < weekStartDates[i],
        `Season ${season.seasonId} weekIds must be chronological.`
      );
    }

    for (const weekId of season.weekIds) {
      const week = weekById.get(weekId);
      assert(week, `Week ${weekId} not found in weeks data.`);
      const weekday = weekdayForCivilDate(week.startDate, timeZone);
      assert(weekday === "Mon", `Week ${week.weekId} must start on Monday.`);
      const startMs = civilDateToEpochMs(week.startDate);
      const endMs = civilDateToEpochMs(addDaysToCivilDate(week.startDate, 6));
      const seasonStart = civilDateToEpochMs(season.startDate);
      const seasonEnd = civilDateToEpochMs(season.endDate);
      assert(
        seasonStart <= startMs && seasonEnd >= endMs,
        `Season ${season.seasonId} must contain week ${week.weekId}.`
      );
    }
  }

  for (const block of blocks) {
    assert(Array.isArray(block.weekIds), `Block ${block.blockId} weekIds must be an array.`);
    assert(block.weekIds.length >= 1, `Block ${block.blockId} must include at least one week.`);

    const blockWeeks = block.weekIds.map((weekId) => {
      const week = weekById.get(weekId);
      assert(week, `Week ${weekId} not found in weeks data.`);
      return week;
    });

    for (let i = 1; i < blockWeeks.length; i += 1) {
      assert(
        blockWeeks[i - 1].startDate < blockWeeks[i].startDate,
        `Block ${block.blockId} weekIds must be chronological.`
      );
    }

    const seasonId = blockWeeks[0]?.seasonId;
    for (const week of blockWeeks) {
      assert(
        week.seasonId === seasonId,
        `Block ${block.blockId} cannot mix seasons.`
      );
    }

    if (seasonId) {
      const season = seasonById.get(seasonId);
      assert(season, `Season ${seasonId} not found for block ${block.blockId}.`);
      for (const week of blockWeeks) {
        assert(
          season.weekIds.includes(week.weekId),
          `Block ${block.blockId} weekIds must be subset of season ${seasonId}.`
        );
      }
    }
  }

  for (const week of weeks) {
    assertWeekWorkoutsShape(week);
    for (const day of DAY_KEYS) {
      const ref = week.workouts[day];
      if (ref === null) continue;
      assert(typeof ref === "string", `week.workouts.${day} must be string or null.`);
      const parsed = parseWorkoutRef(ref);
      const key = `${parsed.workoutId}@v${parsed.version}`;
      assert(
        workoutByKey.has(key),
        `Workout ${key} not found or is draft (referenced by week ${week.weekId}).`
      );
    }
  }
}

function createCalendarSelectors(data, options = {}) {
  const shouldValidate = options.validate !== false;
  if (shouldValidate) {
    assertCalendarData(data, options);
  }
  return {
    resolveActiveSeason: (date) =>
      resolveActiveSeason(data.seasons ?? [], date, options.timeZone),
    resolveWeekForDate: (season, date) =>
      resolveWeekForDate(season, data.weeks ?? [], date, options.timeZone),
    resolveWorkoutOfDay: (date) =>
      resolveWorkoutOfDay(data, date, options),
  };
}

export {
  DEFAULT_TIME_ZONE,
  DAY_KEYS,
  resolveActiveSeason,
  resolveWeekForDate,
  resolveWorkoutOfDay,
  assertCalendarData,
  createCalendarSelectors,
};
