export type ServiceItem = {
  id: string;
  title: string;
  description: string;
};

export type SiteContent = {
  brandName: string;
  eyebrow: string;
  headline: string;
  headlineAccent: string;
  introduction: string;
  statementLead: string;
  statementTitle: string;
  aboutTitle: string;
  aboutBody: string;
  approachTitle: string;
  approachBody: string;
  heroImageUrl: string;
  heroImageAlt: string;
  instagramHandle: string;
  instagramUrl: string;
  ctaLabel: string;
  ctaTitle: string;
  ctaBody: string;
  services: ServiceItem[];
};

export type Article = {
  id: string;
  title: string;
  slug: string;
  excerpt: string;
  body: string;
  category: string;
  coverImageUrl: string;
  published: boolean;
  publishedAt: string;
};

export const DEFAULT_SITE_CONTENT: SiteContent = {
  brandName: "Anna the Counselor",
  eyebrow: "Counseling · Reflection · Growth",
  headline: "A softer place to",
  headlineAccent: "meet yourself.",
  introduction:
    "Thoughtful support for the moments that feel heavy, uncertain, or ready for change. This is a space to pause, understand what is happening, and move forward with greater clarity.",
  statementLead: "You do not have to have every answer before you begin.",
  statementTitle: "We can make room for the next step together.",
  aboutTitle: "Support that starts with listening.",
  aboutBody:
    "Anna offers a warm, grounded space for honest conversation and meaningful reflection. Her work is centered on helping people understand their experiences, reconnect with their strengths, and take practical steps toward the life and relationships they want.",
  approachTitle: "A thoughtful, human approach.",
  approachBody:
    "Every person arrives with a different story. Sessions are shaped around your needs, your pace, and the kind of support that feels useful to you.",
  heroImageUrl: "/anna-counseling-hero.png",
  heroImageAlt: "A calm counseling room with two chairs in warm morning light",
  instagramHandle: "@annathecounselor",
  instagramUrl: "https://www.instagram.com/annathecounselor/",
  ctaLabel: "Connect on Instagram",
  ctaTitle: "Ready to begin a conversation?",
  ctaBody:
    "Reach out through Anna’s official Instagram profile for current availability and more information.",
  services: [
    {
      id: "individual-support",
      title: "Individual support",
      description:
        "A private space to explore emotions, patterns, decisions, and the changes you want to make.",
    },
    {
      id: "relationship-support",
      title: "Relationship support",
      description:
        "Thoughtful conversations that help bring more understanding, clarity, and intention to relationships.",
    },
    {
      id: "life-transitions",
      title: "Life transitions",
      description:
        "Grounded support while navigating change, uncertainty, identity, loss, or a new season of life.",
    },
  ],
};

export const DEFAULT_ARTICLES: Article[] = [
  {
    id: "making-space-for-hard-emotions",
    slug: "making-space-for-hard-emotions",
    title: "Making space for difficult emotions",
    excerpt:
      "A gentle reminder that understanding a feeling can be more useful than rushing to silence it.",
    body:
      "Some feelings arrive loudly. Others stay beneath the surface and shape the way we move through our day. Instead of immediately asking how to get rid of an emotion, it can help to ask what it may be trying to communicate.\n\nMaking space does not mean letting a feeling control every decision. It means noticing it without judgment, naming what is present, and giving yourself enough room to respond with intention.",
    category: "Emotional wellbeing",
    coverImageUrl: "",
    published: true,
    publishedAt: "2026-08-20T09:00:00.000Z",
  },
  {
    id: "when-rest-feels-uncomfortable",
    slug: "when-rest-feels-uncomfortable",
    title: "When rest feels uncomfortable",
    excerpt:
      "Rest can feel unfamiliar when your body has learned to measure safety through constant activity.",
    body:
      "Rest is not always immediately peaceful. For someone accustomed to staying busy, slowing down can bring up guilt, worry, or a sense that something has been forgotten.\n\nBeginning with small pauses can make rest feel more accessible. A few quiet breaths, a short walk without a task, or one unhurried cup of tea can help the nervous system learn that stillness can also be safe.",
    category: "Gentle practices",
    coverImageUrl: "",
    published: true,
    publishedAt: "2026-08-12T09:00:00.000Z",
  },
];

export function mapArticle(data: Record<string, unknown>): Article {
  const slug = String(data.slug ?? "");
  return {
    id: slug,
    title: String(data.title ?? "Untitled article"),
    slug,
    excerpt: String(data.excerpt ?? ""),
    body: String(data.body ?? ""),
    category: String(data.category ?? "Reflection"),
    coverImageUrl: String(data.cover_image_url ?? ""),
    published: Boolean(data.published),
    publishedAt: String(data.published_at ?? new Date().toISOString()),
  };
}

export function articleToRow(article: Article, slug: string, userId: string) {
  const publishedDate = new Date(article.publishedAt || Date.now());
  return {
    slug,
    title: article.title.trim(),
    excerpt: article.excerpt.trim(),
    body: article.body.trim(),
    category: article.category.trim() || "Reflection",
    cover_image_url: article.coverImageUrl,
    published: article.published,
    published_at: Number.isNaN(publishedDate.getTime()) ? new Date().toISOString() : publishedDate.toISOString(),
    updated_at: new Date().toISOString(),
    updated_by: userId,
  };
}

export function createBlankArticle(): Article {
  return {
    id: "",
    title: "",
    slug: "",
    excerpt: "",
    body: "",
    category: "Reflection",
    coverImageUrl: "",
    published: false,
    publishedAt: new Date().toISOString().slice(0, 10),
  };
}
