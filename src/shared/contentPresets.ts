export type ContentPresetOutput = {
  exportKey: string;
  format: string;
};

export type ContentPresetCopyConfig = {
  target: string;
  tone: string;
  enabled: boolean;
};

export type ContentPresetRenderOptions = {
  pois?: boolean;
  sections?: boolean;
  elevation?: boolean;
  overlays?: boolean;
};

export type ContentPreset = {
  id: string;
  label: string;
  icon: string;
  description: string;
  defaultTier: string | null;
  outputs: ContentPresetOutput[];
  copyConfig: ContentPresetCopyConfig;
  renderOptions?: ContentPresetRenderOptions;
};

export const CONTENT_PRESETS: ContentPreset[] = [
  {
    id: "route-intel",
    label: "Route Intel",
    icon: "\uD83D\uDDFA\uFE0F",
    description: "Story + Carousel + Caption",
    defaultTier: "XL",
    outputs: [
      { exportKey: "route-intel-card", format: "story" },
      { exportKey: "route-intel-sections-carousel", format: "carousel" },
    ],
    copyConfig: {
      target: "route",
      tone: "gritty",
      enabled: true,
    },
    renderOptions: {
      pois: true,
      sections: true,
      elevation: true,
      overlays: false,
    },
  },
  {
    id: "event-hype",
    label: "Event Hype",
    icon: "\uD83C\uDFC3",
    description: "Poster + Caption",
    defaultTier: null,
    outputs: [{ exportKey: "event-poster", format: "square" }],
    copyConfig: {
      target: "event",
      tone: "hype",
      enabled: true,
    },
  },
  {
    id: "weekly-schedule",
    label: "Weekly Schedule",
    icon: "\uD83D\uDCC5",
    description: "Story + Reel",
    defaultTier: null,
    outputs: [
      { exportKey: "weekly-schedule-story", format: "story" },
      { exportKey: "weekly-schedule-reel", format: "video" },
    ],
    copyConfig: {
      target: "event",
      tone: "informational",
      enabled: true,
    },
  },
];
