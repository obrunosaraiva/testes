import { QuizContainer } from "@/components/quiz/QuizContainer";

interface QuizPageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

export default async function QuizPage({ searchParams }: QuizPageProps) {
  const params = await searchParams;
  const utm = {
    source: stringParam(params.utm_source),
    medium: stringParam(params.utm_medium),
    campaign: stringParam(params.utm_campaign),
  };

  return <QuizContainer utm={utm} />;
}

function stringParam(v: string | string[] | undefined): string | undefined {
  if (Array.isArray(v)) return v[0];
  return v;
}
