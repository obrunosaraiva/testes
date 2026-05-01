import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getProfile } from "@/lib/actions/quiz";
import { ProfileRevealScreen } from "@/components/quiz/ProfileRevealScreen";

interface PageProps {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { id } = await params;
  const result = await getProfile(id);
  if (!result.ok) {
    return {
      title: "Diagnóstico Íntimo",
      description: "Perfil Íntimo personalizado.",
    };
  }
  const { firstName, profile } = result.data;
  return {
    title: `${firstName} é ${profile.name} — Diagnóstico Íntimo`,
    description: profile.tagline,
    openGraph: {
      title: `Eu sou ${profile.name}`,
      description: profile.tagline,
      type: "website",
    },
  };
}

export default async function ResultadoPage({ params }: PageProps) {
  const { id } = await params;
  const result = await getProfile(id);
  if (!result.ok) notFound();

  const { firstName, profile } = result.data;
  return <ProfileRevealScreen firstName={firstName} profile={profile} />;
}
