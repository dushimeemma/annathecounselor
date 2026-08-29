"use client";

import Link from "next/link";
import Image from "next/image";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";

import { getSupabaseClient, supabaseConfigured } from "@/lib/supabase";
import { DEFAULT_ARTICLES, mapArticle, type Article } from "@/lib/site-content";

export default function JournalArticlePage() {
  const params = useParams<{ slug: string }>();
  const slug = params?.slug;
  const [article, setArticle] = useState<Article | null>(() =>
    DEFAULT_ARTICLES.find((item) => item.slug === slug) ?? null,
  );
  const [loading, setLoading] = useState(supabaseConfigured);

  useEffect(() => {
    if (!slug || !supabaseConfigured) return;
    const supabase = getSupabaseClient();
    void supabase
      .from("posts")
      .select("*")
      .eq("slug", slug)
      .eq("published", true)
      .maybeSingle()
      .then(({ data }) => {
        setArticle(data ? mapArticle(data) : DEFAULT_ARTICLES.find((item) => item.slug === slug) ?? null);
        setLoading(false);
      });
  }, [slug]);

  if (loading) return <div className="journal-loading">Opening reflection…</div>;

  return (
    <main className="journal-page">
      <header className="journal-page-header">
        <Link className="anna-brand" href="/">
          <span className="anna-mark" aria-label="Anna the Counselor">A<span>.</span></span>
          <span>Anna the Counselor</span>
        </Link>
        <Link className="journal-back" href="/#journal">← Journal</Link>
      </header>
      {article ? (
        <article className="journal-article">
          <p className="anna-eyebrow">
            {article.category} · {new Date(article.publishedAt).toLocaleDateString("en", { month: "long", day: "numeric", year: "numeric" })}
          </p>
          <h1>{article.title}</h1>
          <p className="journal-excerpt">{article.excerpt}</p>
          {article.coverImageUrl ? (
            <Image className="journal-cover" src={article.coverImageUrl} alt="" width={1200} height={760} unoptimized />
          ) : null}
          <div className="journal-body">{article.body}</div>
        </article>
      ) : (
        <section className="journal-article">
          <p className="anna-eyebrow">Journal</p>
          <h1>This reflection is not available.</h1>
          <p className="journal-excerpt">It may still be a draft or may have been removed.</p>
          <Link className="anna-primary-button" href="/#journal">Return to the journal</Link>
        </section>
      )}
    </main>
  );
}
