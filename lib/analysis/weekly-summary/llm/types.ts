type WeeklySummaryOutput = {
  headline: string;
  bullets: {
    text: string;
    referencedThreadIds?: string[];
    referencedEventIds?: string[];
  }[];
  confidence?: number;
};
