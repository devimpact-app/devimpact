import OneOnOneDetailClient from './OneOnOneDetail';

export default async function OneOnOneDetailPage(props: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await props.params;
  return <OneOnOneDetailClient id={id} />;
}
