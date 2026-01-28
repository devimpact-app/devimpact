import WeeklySummaryDetailContainer from './WeeklySummaryDetailsContainer';

export default async function WeeklySummaryDetailPage(props: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await props.params;
  return <WeeklySummaryDetailContainer summaryId={id} />;
}
