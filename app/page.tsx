"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { ArrowRight, AtSign, Check, Play } from "lucide-react";

import { getSupabaseClient, supabaseConfigured } from "@/lib/supabase";
import {
  DEFAULT_ARTICLES,
  DEFAULT_SITE_CONTENT,
  mapArticle,
  type Article,
  type SiteContent,
} from "@/lib/site-content";

function BrandMark({ label, compact = false }: { label: string; compact?: boolean }) {
  return (
    <span className={compact ? "anna-monika-mark compact" : "anna-monika-mark"} aria-label={label}>
      <span className="mark-petal mark-petal-one" />
      <span className="mark-petal mark-petal-two" />
      <span className="mark-petal mark-petal-three" />
      <span className="mark-petal mark-petal-four" />
    </span>
  );
}

export default function Home() {
  const [content, setContent] = useState<SiteContent>(DEFAULT_SITE_CONTENT);
  const [articles, setArticles] = useState<Article[]>(DEFAULT_ARTICLES);

  useEffect(() => {
    if (!supabaseConfigured) return;
    const supabase = getSupabaseClient();
    let active = true;

    async function loadContent() {
      const { data } = await supabase
        .from("site_content")
        .select("content")
        .eq("id", "main")
        .maybeSingle();
      if (active && data?.content) {
        setContent({ ...DEFAULT_SITE_CONTENT, ...(data.content as Partial<SiteContent>) });
      }
    }

    async function loadArticles() {
      const { data } = await supabase
        .from("posts")
        .select("*")
        .eq("published", true)
        .order("published_at", { ascending: false });
      if (active && data) {
        setArticles(data.map((article) => mapArticle(article)));
      }
    }

    void Promise.all([loadContent(), loadArticles()]);
    const channel = supabase
      .channel("anna-public-content")
      .on("postgres_changes", { event: "*", schema: "public", table: "site_content" }, () => void loadContent())
      .on("postgres_changes", { event: "*", schema: "public", table: "posts" }, () => void loadArticles())
      .subscribe();

    return () => {
      active = false;
      void supabase.removeChannel(channel);
    };
  }, []);

  const featuredArticles = useMemo(() => articles.slice(0, 3), [articles]);
  const services = content.services.slice(0, 3);
  const heroImage = content.heroImageUrl?.trim() || DEFAULT_SITE_CONTENT.heroImageUrl;

  return (
    <main className="anna-site anna-reference-layout">
      <header className="anna-header">
        <a className="anna-brand" href="#top">
          <BrandMark label={content.brandName} />
          <strong>{content.brandName}</strong>
        </a>
        <nav className="anna-nav" aria-label="Main navigation">
          <a href="#about">About</a>
          <a href="#work">Work with me</a>
          <a href="#services">Services</a>
          <a href="#reflections">Reflections</a>
          <a href="#journal">Blog</a>
          <a href="#contact">Contact</a>
        </nav>
        <a className="anna-mobile-social" href={content.instagramUrl} target="_blank" rel="noreferrer" aria-label="Anna on Instagram">
          <AtSign aria-hidden="true" />
        </a>
      </header>

      <section className="anna-hero" id="top">
        <Image src={heroImage} alt={content.heroImageAlt} fill priority unoptimized sizes="100vw" />
        <div className="anna-hero-shade" />
        <div className="anna-hero-content">
          <p>{content.eyebrow}</p>
          <h1>{content.headline}<br />{content.headlineAccent}</h1>
          <a className="anna-turquoise-button" href={content.instagramUrl} target="_blank" rel="noreferrer">
            {content.ctaLabel}
          </a>
        </div>
      </section>

      <section className="anna-commitment" id="about">
        <p>{content.statementLead}</p>
        <h2>{content.statementTitle}</h2>
        <em>The first step can be gentle.</em>
      </section>

      <section className="anna-blue-feature" id="work">
        <div>
          <p className="anna-mini-label">A thoughtful place to begin</p>
          <h2>{content.approachTitle}</h2>
          <a className="anna-turquoise-button" href="#services">Explore support</a>
        </div>
        <a className="anna-feature-video" href="#services" aria-label="Explore Anna's approach">
          <Image src={heroImage} alt="" fill unoptimized sizes="240px" />
          <span><Play aria-hidden="true" /></span>
        </a>
      </section>

      <section className="anna-feature-cards" id="services">
        <article className="anna-feature-card">
          <div className="anna-feature-card-image crop-left">
            <Image src={heroImage} alt="A calm counseling space" fill unoptimized sizes="300px" />
          </div>
          <h3>Work With Anna</h3>
          <a href="#program">Learn more</a>
        </article>
        <article className="anna-feature-card">
          <div className="anna-feature-card-image anna-teal-card">
            <span>Pause</span><span>Reflect</span><span>Grow</span>
          </div>
          <h3>{services[0]?.title ?? "Counseling"}</h3>
          <a href="#program">Discover support</a>
        </article>
        <article className="anna-feature-card">
          <div className="anna-feature-card-image crop-right">
            <Image src={heroImage} alt="A welcoming place for conversation" fill unoptimized sizes="300px" />
          </div>
          <h3>Blog</h3>
          <a href="#journal">Read now</a>
        </article>
      </section>

      <section className="anna-testimonial" id="reflections">
        <h2>A Word From Anna</h2>
        <div className="anna-testimonial-avatar"><BrandMark label={content.brandName} compact /></div>
        <blockquote>“The work is not about becoming someone else. It is about finding a more honest way home to yourself.”</blockquote>
        <strong>{content.brandName}</strong>
        <div className="anna-slider-dots" aria-hidden="true"><span /><span /><span /></div>
      </section>

      <section className="anna-program" id="program">
        <div className="anna-program-copy">
          <p className="anna-mini-label">Work with Anna</p>
          <h2>{content.aboutTitle}</h2>
          <p>{content.aboutBody}</p>
          <em>Support may include:</em>
          <ul>
            {services.map((service) => (
              <li key={service.id || service.title}><Check aria-hidden="true" /><span><strong>{service.title}</strong>{service.description}</span></li>
            ))}
          </ul>
          <a className="anna-turquoise-button" href={content.instagramUrl} target="_blank" rel="noreferrer">{content.ctaLabel}</a>
        </div>
        <div className="anna-program-visual">
          <div className="anna-program-main-image"><Image src={heroImage} alt={content.heroImageAlt} fill unoptimized sizes="420px" /></div>
          <div className="anna-program-roundel"><BrandMark label={content.brandName} /></div>
        </div>
      </section>

      <section className="anna-journal" id="journal">
        <p className="anna-mini-label">From the journal</p>
        <h2>Reflections for everyday life</h2>
        {featuredArticles.length ? (
          <div className="anna-journal-grid">
            {featuredArticles.map((article) => (
              <article key={article.id}>
                <p>{article.category}</p>
                <h3>{article.title}</h3>
                <div>{article.excerpt}</div>
                <Link href={`/journal/${article.slug}`}>Read reflection <ArrowRight aria-hidden="true" /></Link>
              </article>
            ))}
          </div>
        ) : <p className="anna-journal-empty">New reflections will appear here soon.</p>}
      </section>

      <section className="anna-final-cta" id="contact">
        <p>{content.instagramHandle}</p>
        <h2>{content.ctaTitle}</h2>
        <div>{content.ctaBody}</div>
        <a className="anna-turquoise-button" href={content.instagramUrl} target="_blank" rel="noreferrer">{content.ctaLabel}</a>
      </section>

      <footer className="anna-footer">
        <nav aria-label="Footer navigation">
          <a href="#about">About</a>
          <a href="#work">Work With Me</a>
          <a href="#services">Services</a>
          <a href="#reflections">Reflections</a>
          <a href="#journal">Blog</a>
          <a href="#contact">Contact</a>
        </nav>
        <div className="anna-footer-brand">
          <BrandMark label={content.brandName} />
          <strong>{content.brandName}</strong>
        </div>
        <div className="anna-footer-social">
          <a href={content.instagramUrl} target="_blank" rel="noreferrer">Instagram</a>
          <a className="anna-outline-button" href={content.instagramUrl} target="_blank" rel="noreferrer">Connect with Anna</a>
        </div>
        <p>© {new Date().getFullYear()} {content.brandName}. All rights reserved.</p>
      </footer>
    </main>
  );
}
