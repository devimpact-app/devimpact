import ThreadDetailsContainer from './ThreadDetailsContainer';

export default async function ThreadDetailPage(props: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await props.params;
  return <ThreadDetailsContainer threadId={id} />;
}
