import SessionDetailClient from "./session-detail-client";

type SessionDetailPageProps = {
  params: { id: string };
};

export default function SessionDetailPage({ params }: SessionDetailPageProps) {
  return <SessionDetailClient sessionId={params.id} />;
}
