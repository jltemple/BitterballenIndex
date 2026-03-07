import type { MetadataRoute } from "next";
import { supabase } from "@/lib/supabase";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

  const { data: bars } = await supabase.from("bars").select("id");

  const barUrls: MetadataRoute.Sitemap = (bars ?? []).flatMap(({ id }) => [
    { url: `${siteUrl}/en/bars/${id}`, changeFrequency: "weekly", priority: 0.6 },
    { url: `${siteUrl}/nl/bars/${id}`, changeFrequency: "weekly", priority: 0.6 },
  ]);

  return [
    { url: `${siteUrl}/en`,       changeFrequency: "daily",  priority: 1.0 },
    { url: `${siteUrl}/nl`,       changeFrequency: "daily",  priority: 1.0 },
    { url: `${siteUrl}/en/bars`,  changeFrequency: "daily",  priority: 0.8 },
    { url: `${siteUrl}/nl/bars`,  changeFrequency: "daily",  priority: 0.8 },
    { url: `${siteUrl}/en/map`,   changeFrequency: "weekly", priority: 0.7 },
    { url: `${siteUrl}/nl/map`,   changeFrequency: "weekly", priority: 0.7 },
    ...barUrls,
  ];
}
