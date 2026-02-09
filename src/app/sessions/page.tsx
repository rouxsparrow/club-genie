import SessionsClient from "./sessions-client";

type SessionsPageProps = {
  searchParams?: Record<string, string | string[] | undefined>;
};

export default function SessionsPage({ searchParams }: SessionsPageProps) {
  return <SessionsClient searchParams={searchParams ?? {}} />;
}
