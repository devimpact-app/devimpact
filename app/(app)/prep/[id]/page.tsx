import PrepDetailClient from './PrepDetailClient';

export default async function PrepDetailPage(props: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await props.params;
  return <PrepDetailClient id={id} />;
}
