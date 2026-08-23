import { fireEvent, render, screen } from "@testing-library/react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";

import { TitleDetailsJournalActions } from "@/features/journal/components/TitleDetailsJournalActions";
import { GameTitleDetailsContent } from "@/features/media/components/GameTitleDetailsContent";
import { TitleDetailsHero } from "@/features/media/components/TitleDetailsHero";
import { getGameDetailsModel } from "@/features/media/model/gameDetails";
import type { NormalizedMediaItem } from "@/types/media";

function loadIgdbDetails() {
  // Runtime-loaded so app TypeScript does not absorb Edge/Deno extension imports.
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  return require("../supabase/functions/_shared/igdb-details") as {
    createIgdbDetailsQuery: (sourceId: string) => string;
    createIgdbTimeToBeatQuery: (sourceId: string) => string;
    fetchNormalizedIgdbDetails: (
      client: {
        query: jest.Mock;
        queryGames: jest.Mock;
      },
      sourceId: string,
    ) => Promise<NormalizedMediaItem>;
    normalizeEligibleIgdbDetails: (
      records: Record<string, unknown>[],
      timeToBeat?: Record<string, unknown>[],
    ) => NormalizedMediaItem;
  };
}

const {
  createIgdbDetailsQuery,
  createIgdbTimeToBeatQuery,
  fetchNormalizedIgdbDetails,
  normalizeEligibleIgdbDetails,
} = loadIgdbDetails();

// Runtime-loaded to preserve the app/Edge TypeScript boundary.
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { IgdbProviderError } = require("../supabase/functions/_shared/provider-errors") as {
  IgdbProviderError: new (code: "igdb_unavailable") => Error;
};
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { HttpError } = require("../supabase/functions/_shared/cors") as {
  HttpError: new (status: number, message: string, code?: string) => Error;
};

const gameRecord = {
  id: 42,
  name: "Tidebound",
  summary: "A sea-faring adventure.",
  first_release_date: 1_704_067_200,
  genres: [{ name: "Adventure" }],
  game_modes: [{ name: "Single player" }],
  multiplayer_modes: [{ name: "Co-op" }],
  player_perspectives: [{ name: "Third person" }],
  themes: [{ name: "Fantasy" }],
  platforms: [{ name: "PC" }, { name: "PlayStation 5" }],
  release_dates: [
    {
      date: 1_704_067_200,
      platform: { name: "PC" },
      release_region: { region: "Worldwide" },
    },
  ],
  involved_companies: [
    { company: { name: "Lantern" }, developer: true },
    { company: { name: "Anchor" }, publisher: true },
  ],
  age_ratings: [
    { organization: { name: "ESRB" }, rating_category: { rating: "Teen" } },
  ],
  videos: [{ name: "Reveal trailer", video_id: "abcDE_12345" }],
  websites: [
    { trusted: true, type: { type: "official" }, url: "https://example.com/game" },
    { trusted: false, type: { type: "steam" }, url: "https://store.example/untrusted" },
  ],
  total_rating: 87.2,
  total_rating_count: 1200,
  game_type: { type: "main_game" },
  game_status: { status: "released" },
};

const gameItem: NormalizedMediaItem = {
  ...normalizeEligibleIgdbDetails(
    [gameRecord],
    [{ game_id: 42, hastily: 18_000, normally: 36_000, completely: 54_000 }],
  ),
  id: "game-media-id",
};

describe("IGDB game-details provider boundary", () => {
  it("uses current fields, provider policy predicates, and trusted websites", () => {
    const query = createIgdbDetailsQuery("0042");
    const item = normalizeEligibleIgdbDetails([gameRecord]);

    expect(query).toContain("where id = 42");
    expect(query).toContain("involved_companies.company.name");
    expect(query).toContain("release_dates.release_region.region");
    expect(query).toContain("total_rating_count");
    expect(query).toContain("version_parent = null");
    expect(query).not.toContain("time_to_beats");
    expect(item).toMatchObject({
      source: "igdb",
      sourceId: "42",
      mediaType: "game",
    });
    expect(item.metadata).toMatchObject({
      totalRating: 87.2,
      totalRatingCount: 1200,
      developers: ["Lantern"],
      publishers: ["Anchor"],
      websites: [{ type: "official", url: "https://example.com/game" }],
      igdbCatalogPolicyVersion: "games-catalog-v1",
    });
  });

  it("uses the shared client for the valid two-endpoint detail flow", async () => {
    const queryGames = jest.fn().mockResolvedValue([gameRecord]);
    const query = jest.fn().mockResolvedValue([
      { game_id: 42, hastily: 18_000, normally: 36_000, completely: 54_000 },
    ]);

    const item = await fetchNormalizedIgdbDetails({ query, queryGames }, "42");

    expect(queryGames).toHaveBeenCalledWith(createIgdbDetailsQuery("42"));
    expect(query).toHaveBeenCalledWith(
      "game_time_to_beats",
      createIgdbTimeToBeatQuery("42"),
    );
    expect(item.metadata.timeToBeat).toEqual({
      hastilySeconds: 18_000,
      normallySeconds: 36_000,
      completelySeconds: 54_000,
    });
  });

  it("keeps eligible details usable when optional time-to-beat enrichment fails", async () => {
    const queryGames = jest.fn().mockResolvedValue([gameRecord]);
    const query = jest
      .fn()
      .mockRejectedValue(new IgdbProviderError("igdb_unavailable"));

    const item = await fetchNormalizedIgdbDetails({ query, queryGames }, "42");

    expect(item).toMatchObject({ source: "igdb", sourceId: "42" });
    expect(item.metadata.timeToBeat).toBeUndefined();
  });

  it("does not swallow a feature disable between detail provider calls", async () => {
    const queryGames = jest.fn().mockResolvedValue([gameRecord]);
    const disabled = new HttpError(
      503,
      "Games are unavailable.",
      "games_feature_disabled",
    );
    const query = jest.fn().mockRejectedValue(disabled);

    await expect(
      fetchNormalizedIgdbDetails({ query, queryGames }, "42"),
    ).rejects.toBe(disabled);
  });

  it("does not request time-to-beat data before the post-fetch policy gate", async () => {
    const queryGames = jest.fn().mockResolvedValue([
      { ...gameRecord, themes: [{ id: 42, name: "Erotic" }] },
    ]);
    const query = jest.fn();

    await expect(
      fetchNormalizedIgdbDetails({ query, queryGames }, "42"),
    ).rejects.toMatchObject({ status: 404 });
    expect(query).not.toHaveBeenCalled();
  });

  it("returns the neutral unavailable-title state for a policy-blocked direct route", () => {
    const excluded = {
      ...gameRecord,
      themes: [{ id: 42, name: "Erotic" }],
    };

    expect(() => normalizeEligibleIgdbDetails([excluded])).toThrow(
      expect.objectContaining({ status: 404 }),
    );
    expect(() => normalizeEligibleIgdbDetails([excluded])).toThrow(
      "Title not found.",
    );
  });

  it("does not interpolate a malformed direct identity into the provider query", () => {
    expect(() => createIgdbDetailsQuery("42; drop table media_items")).toThrow(
      "Invalid IGDB source id.",
    );
  });
});

describe("game details presentation", () => {
  const safeAreaMetrics = {
    frame: { x: 0, y: 0, width: 390, height: 844 },
    insets: { top: 24, right: 0, bottom: 34, left: 0 },
  };

  it("keeps IGDB score separate from a user Journal rating and renders supported sections only", async () => {
    await render(<GameTitleDetailsContent item={gameItem} />);

    expect(screen.getByText("Platforms & releases")).toBeTruthy();
    expect(screen.getByText("Typical completion")).toBeTruthy();
    expect(screen.getByRole("link", { name: "Open official" })).toBeTruthy();
    expect(screen.queryByRole("link", { name: /steam/i })).toBeNull();
    expect(
      screen.queryByText(/Achievements|Owned|Installed|Hours played/),
    ).toBeNull();
  });

  it("labels provider score in the cinematic hero and keeps a fallback when game artwork is absent", async () => {
    await render(
      <SafeAreaProvider initialMetrics={safeAreaMetrics}>
        <TitleDetailsHero
          item={{ ...gameItem, backdropUrl: null, imageUrl: null }}
        />
      </SafeAreaProvider>,
    );

    expect(screen.getByTestId("title-backdrop-fallback")).toBeTruthy();
    expect(screen.getByText("87 IGDB total")).toBeTruthy();
  });

  it("uses the locked game action labels and preserves a finished play as history", async () => {
    const onIntent = jest.fn();
    const onEditCompletedPlay = jest.fn();
    await render(
      <TitleDetailsJournalActions
        addToListLoading={false}
        canAddToList
        canUseJournal
        isSignedIn
        mediaType="game"
        onAddToList={jest.fn()}
        onEditCompletedPlay={onEditCompletedPlay}
        onIntent={onIntent}
        onRemovePlan={jest.fn()}
        onRemoveTitle={jest.fn()}
        onSignIn={jest.fn()}
        onWatchTrailer={jest.fn()}
        removing={false}
        showTrailer
        summary={{
          activityCount: 2,
          completedWatchCount: 2,
          latestCompletedEvent: {
            eventDate: "2026-08-10",
            id: "completed-play",
            journalEntryId: "entry-1",
            notes: null,
            rating: 4.5,
            type: "completed",
          },
          titleState: {
            activePlan: null,
            id: "entry-1",
            mediaItemId: "game-media-id",
            status: "completed",
            undatedCompletedCount: 0,
          },
        }}
      />,
    );

    expect(screen.getByRole("button", { name: "Play again" })).toBeTruthy();
    await fireEvent.press(
      screen.getByRole("button", { name: "Edit completed play" }),
    );
    expect(onEditCompletedPlay).toHaveBeenCalledTimes(1);
    expect(onIntent).not.toHaveBeenCalled();
  }, 20_000);

  it("exposes direct completion without a start event for a new game", async () => {
    const onIntent = jest.fn();
    await render(
      <TitleDetailsJournalActions
        addToListLoading={false}
        canAddToList={false}
        canUseJournal
        isSignedIn
        mediaType="game"
        onAddToList={jest.fn()}
        onIntent={onIntent}
        onRemovePlan={jest.fn()}
        onRemoveTitle={jest.fn()}
        onSignIn={jest.fn()}
        onWatchTrailer={jest.fn()}
        removing={false}
        showTrailer={false}
        summary={null}
      />,
    );

    await fireEvent.press(
      screen.getByRole("button", { name: "Already played? Log as finished" }),
    );
    expect(
      screen.getByText("Already played? Log as finished").props.numberOfLines,
    ).toBeUndefined();
    expect(onIntent).toHaveBeenCalledWith(
      expect.objectContaining({ intent: "log_finished" }),
    );
  });

  it("defers playing updates without creating a false resume event", async () => {
    const onIntent = jest.fn();
    await render(
      <TitleDetailsJournalActions
        addToListLoading={false}
        canAddToList={false}
        canUseJournal
        isSignedIn
        mediaType="game"
        onAddToList={jest.fn()}
        onIntent={onIntent}
        onRemovePlan={jest.fn()}
        onRemoveTitle={jest.fn()}
        onSignIn={jest.fn()}
        onWatchTrailer={jest.fn()}
        removing={false}
        showTrailer={false}
        summary={{
          activityCount: 1,
          completedWatchCount: 0,
          latestCompletedEvent: null,
          titleState: {
            activePlan: null,
            id: "entry-1",
            mediaItemId: "game-media-id",
            status: "in_progress",
            undatedCompletedCount: 0,
          },
        }}
      />,
    );

    const update = screen.getByRole("button", { name: "Update playing" });
    expect(update.props.accessibilityState).toEqual({ disabled: true });
    await fireEvent.press(update);
    expect(onIntent).not.toHaveBeenCalled();
    expect(screen.getByText("Playing updates arrive with the Games Journal flow.")).toBeTruthy();
    expect(screen.getByRole("button", { name: "Finish playing" })).toBeTruthy();
  });

  it("uses game-aware resume language for a stopped play", async () => {
    await render(
      <TitleDetailsJournalActions
        addToListLoading={false}
        canAddToList={false}
        canUseJournal
        isSignedIn
        mediaType="game"
        onAddToList={jest.fn()}
        onIntent={jest.fn()}
        onRemovePlan={jest.fn()}
        onRemoveTitle={jest.fn()}
        onSignIn={jest.fn()}
        onWatchTrailer={jest.fn()}
        removing={false}
        showTrailer={false}
        summary={{
          activityCount: 1,
          completedWatchCount: 0,
          latestCompletedEvent: null,
          titleState: {
            activePlan: null,
            id: "entry-1",
            mediaItemId: "game-media-id",
            status: "dropped",
            undatedCompletedCount: 0,
          },
        }}
      />,
    );

    expect(screen.getByRole("button", { name: "Resume playing" })).toBeTruthy();
    expect(screen.queryByRole("button", { name: "Resume watching" })).toBeNull();
  });

  it("derives no unsupported personal state from supported platform metadata", () => {
    const model = getGameDetailsModel(gameItem);
    expect(model.platforms).toEqual(["PC", "PlayStation 5"]);
    expect(model).not.toHaveProperty("owned");
    expect(model).not.toHaveProperty("achievements");
    expect(model).not.toHaveProperty("playedOn");
  });
});
