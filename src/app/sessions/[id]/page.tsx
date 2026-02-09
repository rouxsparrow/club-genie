import SessionDetailClient from "./session-detail-client";

type SessionDetailPageProps = {
  params: { id: string };
  searchParams?: Record<string, string | string[] | undefined>;
};

export default function SessionDetailPage({ params, searchParams }: SessionDetailPageProps) {
  return <SessionDetailClient sessionId={params.id} searchParams={searchParams ?? {}} />;
}
