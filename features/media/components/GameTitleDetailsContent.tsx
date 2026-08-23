import * as Linking from "expo-linking";
import { Alert, Pressable, Text, View } from "react-native";

import { getGameDetailsModel } from "@/features/media/model/gameDetails";
import type { NormalizedMediaItem } from "@/types/media";

type Props = { item: NormalizedMediaItem };

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <View className="flex-row items-start justify-between gap-5 border-b border-archive-700 py-3">
      <Text className="text-sm text-archive-300">{label}</Text>
      <Text className="max-w-[65%] text-right text-sm font-medium text-archive-100">
        {value}
      </Text>
    </View>
  );
}

export function GameTitleDetailsContent({ item }: Props) {
  const game = getGameDetailsModel(item);
  const hasPlatformSection =
    game.platforms.length > 0 || game.releaseDates.length > 0;
  const details = [
    game.developer ? { label: "Developer", value: game.developer } : null,
    game.publisher ? { label: "Publisher", value: game.publisher } : null,
    game.firstReleased
      ? { label: "First released", value: game.firstReleased }
      : null,
    game.ageRating ? { label: "Age rating", value: game.ageRating } : null,
    ...game.timeToBeat,
  ].filter((value): value is { label: string; value: string } =>
    Boolean(value),
  );

  return (
    <>
      {game.classifications.length > 0 ? (
        <View className="flex-row flex-wrap gap-2">
          {game.classifications.map((classification) => (
            <View
              className="rounded-full border border-archive-700 bg-archive-800 px-3 py-2"
              key={classification}
            >
              <Text className="text-xs text-archive-200">{classification}</Text>
            </View>
          ))}
        </View>
      ) : null}

      {hasPlatformSection ? (
        <View className="gap-3 border-b border-archive-700 pb-7">
          <Text className="font-serif text-2xl text-archive-50">
            Platforms & releases
          </Text>
          {game.releaseDates.length > 0 ? (
            <View className="gap-2">
              {game.releaseDates.slice(0, 6).map((release, index) => (
                <View
                  className="rounded-app border border-archive-700 bg-archive-800 px-4 py-3"
                  key={`${release.platform ?? "release"}-${release.date ?? index}`}
                >
                  <Text className="text-sm font-semibold text-archive-50">
                    {release.platform ?? "Platform release"}
                  </Text>
                  {release.date || release.region ? (
                    <Text className="mt-1 text-xs text-archive-300">
                      {[release.region, release.date]
                        .filter(Boolean)
                        .join(" · ")}
                    </Text>
                  ) : null}
                </View>
              ))}
            </View>
          ) : null}
          {game.platforms.length > 0 ? (
            <Text className="text-sm leading-5 text-archive-200">
              Supported platforms · {game.platforms.join(" · ")}
            </Text>
          ) : null}
          <Text className="text-xs leading-4 text-archive-400">
            Platforms are provider metadata, not an indication of ownership or
            where you played.
          </Text>
        </View>
      ) : null}

      {details.length > 0 ? (
        <View>
          <Text className="font-serif text-2xl text-archive-50">Details</Text>
          <View className="mt-2 border-t border-archive-700">
            {details.map((detail) => (
              <DetailRow {...detail} key={detail.label} />
            ))}
          </View>
          {game.timeToBeat.length > 0 ? (
            <Text className="mt-3 text-xs leading-4 text-archive-400">
              Time to beat is a public estimate, not your tracked playtime.
            </Text>
          ) : null}
        </View>
      ) : null}

      {game.websites.length > 0 ? (
        <View className="gap-2">
          <Text className="font-serif text-2xl text-archive-50">Official links</Text>
          {game.websites.map((website) => (
            <Pressable
              accessibilityHint="Opens a trusted provider link in your browser."
              accessibilityLabel={`Open ${website.label}`}
              accessibilityRole="link"
              className="min-h-12 justify-center border-b border-archive-700 py-2"
              key={website.url}
              onPress={() => {
                void Linking.openURL(website.url).catch(() => {
                  Alert.alert("Link unavailable", "Unable to open this link right now.");
                });
              }}>
              <Text className="capitalize text-sm font-semibold text-gold-300">
                {website.label}
              </Text>
            </Pressable>
          ))}
        </View>
      ) : null}
    </>
  );
}
