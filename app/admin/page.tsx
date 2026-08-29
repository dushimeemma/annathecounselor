"use client";

import Link from "next/link";
import Image from "next/image";
import { FormEvent, useEffect, useState } from "react";
import type { User } from "@supabase/supabase-js";
import {
  ExternalLink,
  ImageUp,
  LogOut,
  Plus,
  Save,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Toaster } from "@/components/ui/sonner";
import { getSupabaseClient, supabaseConfigured } from "@/lib/supabase";
import {
  articleToRow,
  createBlankArticle,
  DEFAULT_SITE_CONTENT,
  mapArticle,
  type Article,
  type SiteContent,
} from "@/lib/site-content";

type SessionStatus = "checking" | "signed-out" | "authorized" | "unconfigured";

function slugify(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export default function AdminPage() {
  const [status, setStatus] = useState<SessionStatus>(supabaseConfigured ? "checking" : "unconfigured");
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [authError, setAuthError] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [signingIn, setSigningIn] = useState(false);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [content, setContent] = useState<SiteContent>(DEFAULT_SITE_CONTENT);
  const [articles, setArticles] = useState<Article[]>([]);
  const [articleDraft, setArticleDraft] = useState<Article>(createBlankArticle());

  useEffect(() => {
    if (!supabaseConfigured) return;
    const supabase = getSupabaseClient();
    let active = true;

    async function verifyAdministrator(user: User | null) {
      if (!active) return;
      if (!user) {
        setCurrentUser(null);
        setStatus("signed-out");
        return;
      }

      const { data: admin, error: adminError } = await supabase
        .from("admins")
        .select("active")
        .eq("user_id", user.id)
        .maybeSingle();

      if (adminError) {
        setAuthError("Supabase setup is incomplete. Run supabase/setup.sql, then try again.");
        await supabase.auth.signOut();
        setStatus("signed-out");
        return;
      }

      if (!admin?.active) {
        setAuthError("This account is valid, but it has not been approved as a CMS administrator.");
        await supabase.auth.signOut();
        setStatus("signed-out");
        return;
      }

      const [{ data: contentRecord }, { data: postRecords }] = await Promise.all([
        supabase.from("site_content").select("content").eq("id", "main").maybeSingle(),
        supabase.from("posts").select("*").order("published_at", { ascending: false }),
      ]);
      if (!active) return;

      setCurrentUser(user);
      setStatus("authorized");
      if (contentRecord?.content) {
        setContent({ ...DEFAULT_SITE_CONTENT, ...(contentRecord.content as Partial<SiteContent>) });
      }
      if (postRecords) {
        setArticles(postRecords.map((post) => mapArticle(post)));
      }
    }

    void supabase.auth.getSession().then(({ data }) => verifyAdministrator(data.session?.user ?? null));
    const { data: authListener } = supabase.auth.onAuthStateChange((_event, session) => {
      window.setTimeout(() => void verifyAdministrator(session?.user ?? null), 0);
    });

    return () => {
      active = false;
      authListener.subscription.unsubscribe();
    };
  }, []);

  async function handleLogin(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSigningIn(true);
    setAuthError("");
    try {
      const { error } = await getSupabaseClient().auth.signInWithPassword({
        email: email.trim(),
        password,
      });
      if (error) throw error;
      setPassword("");
    } catch {
      setAuthError("The email or password is incorrect, or Supabase email sign-in is not enabled.");
    } finally {
      setSigningIn(false);
    }
  }

  async function handleLogout() {
    await getSupabaseClient().auth.signOut();
  }

  function updateContent<K extends keyof SiteContent>(key: K, value: SiteContent[K]) {
    setContent((current) => ({ ...current, [key]: value }));
  }

  async function saveSiteContent() {
    setSaving(true);
    try {
      if (!currentUser) throw new Error("Administrator session required.");
      const { error } = await getSupabaseClient()
        .from("site_content")
        .upsert({
          id: "main",
          content,
          updated_at: new Date().toISOString(),
          updated_by: currentUser.id,
        }, { onConflict: "id" });
      if (error) throw error;
      toast.success("Website content saved");
    } catch {
      toast.error("Content could not be saved. Check your Supabase policies.");
    } finally {
      setSaving(false);
    }
  }

  async function uploadImage(file: File, folder: string) {
    if (!file.type.startsWith("image/")) throw new Error("Choose an image file.");
    if (file.size > 5 * 1024 * 1024) throw new Error("Images must be 5 MB or smaller.");

    const supabase = getSupabaseClient();
    const safeName = file.name.toLowerCase().replace(/[^a-z0-9.]+/g, "-");
    const objectPath = `${folder}/${Date.now()}-${safeName}`;
    const { error } = await supabase.storage
      .from("site-images")
      .upload(objectPath, file, { contentType: file.type, upsert: false });
    if (error) throw error;
    return supabase.storage.from("site-images").getPublicUrl(objectPath).data.publicUrl;
  }

  async function handleHeroUpload(file?: File) {
    if (!file) return;
    setUploading(true);
    try {
      const url = await uploadImage(file, "hero");
      updateContent("heroImageUrl", url);
      toast.success("Hero image uploaded. Save the page to publish it.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Image upload failed.");
    } finally {
      setUploading(false);
    }
  }

  function addService() {
    updateContent("services", [
      ...content.services,
      { id: `service-${Date.now()}`, title: "New support area", description: "Describe this service." },
    ]);
  }

  function updateService(index: number, field: "title" | "description", value: string) {
    updateContent(
      "services",
      content.services.map((service, serviceIndex) =>
        serviceIndex === index ? { ...service, [field]: value } : service,
      ),
    );
  }

  function removeService(index: number) {
    updateContent("services", content.services.filter((_, serviceIndex) => serviceIndex !== index));
  }

  async function handleArticleImage(file?: File) {
    if (!file) return;
    setUploading(true);
    try {
      const url = await uploadImage(file, "journal");
      setArticleDraft((current) => ({ ...current, coverImageUrl: url }));
      toast.success("Article image uploaded");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Image upload failed.");
    } finally {
      setUploading(false);
    }
  }

  async function saveArticle() {
    const articleSlug = articleDraft.id || slugify(articleDraft.slug || articleDraft.title);
    if (!articleDraft.title.trim() || !articleSlug || !articleDraft.body.trim()) {
      toast.error("Add a title, URL slug, and article body before saving.");
      return;
    }

    setSaving(true);
    try {
      if (!currentUser) throw new Error("Administrator session required.");
      const supabase = getSupabaseClient();
      const previousSlug = articleDraft.id;
      const row = articleToRow(articleDraft, articleSlug, currentUser.id);
      const { error } = await supabase.from("posts").upsert(row, { onConflict: "slug" });
      if (error) throw error;
      if (previousSlug && previousSlug !== articleSlug) {
        const { error: deletePreviousError } = await supabase.from("posts").delete().eq("slug", previousSlug);
        if (deletePreviousError) throw deletePreviousError;
      }
      const savedArticle = mapArticle(row);
      setArticles((current) =>
        [savedArticle, ...current.filter((article) => article.id !== previousSlug && article.id !== articleSlug)]
          .sort((a, b) => Date.parse(b.publishedAt) - Date.parse(a.publishedAt)),
      );
      setArticleDraft((current) => ({ ...current, id: articleSlug, slug: articleSlug }));
      toast.success(articleDraft.published ? "Article published" : "Draft saved");
    } catch {
      toast.error("Article could not be saved. Check your Supabase policies.");
    } finally {
      setSaving(false);
    }
  }

  async function deleteArticle() {
    if (!articleDraft.id) return;
    try {
      const { error } = await getSupabaseClient().from("posts").delete().eq("slug", articleDraft.id);
      if (error) throw error;
      setArticles((current) => current.filter((article) => article.id !== articleDraft.id));
      setArticleDraft(createBlankArticle());
      toast.success("Article deleted");
    } catch {
      toast.error("Article could not be deleted.");
    }
  }

  if (status === "checking") {
    return <div className="admin-loading"><div className="admin-spinner" aria-label="Checking administrator session" /></div>;
  }

  if (status === "unconfigured") {
    return (
      <main className="admin-page admin-login-shell">
        <section className="admin-login-brand">
          <div className="admin-monogram">A.</div>
          <div>
            <h1>Anna&apos;s content studio.</h1>
            <p>The CMS is ready. Connect Supabase to activate secure sign-in, content editing, and image uploads.</p>
          </div>
        </section>
        <section className="admin-login-panel">
          <Card className="admin-login-card">
            <CardHeader>
              <CardTitle>Supabase setup required</CardTitle>
              <CardDescription>Add the public Supabase project configuration to the environment.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="admin-status-note">
                Copy <strong>supabase.env</strong> to <strong>.env.local</strong>, then restart the application.
                <code className="admin-config-code">cp supabase.env .env.local</code>
              </div>
            </CardContent>
          </Card>
        </section>
      </main>
    );
  }

  if (status === "signed-out") {
    return (
      <main className="admin-page admin-login-shell">
        <section className="admin-login-brand">
          <div className="admin-monogram">A.</div>
          <div>
            <h1>Anna&apos;s content studio.</h1>
            <p>Update the website, refine services, upload imagery, and publish new reflections from one protected space.</p>
          </div>
        </section>
        <section className="admin-login-panel">
          <Card className="admin-login-card">
            <CardHeader>
              <CardTitle>Administrator sign in</CardTitle>
              <CardDescription>Use the email account approved in Supabase.</CardDescription>
            </CardHeader>
            <CardContent>
              <form className="admin-login-form" onSubmit={handleLogin}>
                {authError ? <div className="admin-status-note">{authError}</div> : null}
                <div className="admin-field">
                  <Label htmlFor="admin-email">Email address</Label>
                  <Input id="admin-email" type="email" autoComplete="email" required value={email} onChange={(event) => setEmail(event.target.value)} />
                </div>
                <div className="admin-field">
                  <Label htmlFor="admin-password">Password</Label>
                  <Input id="admin-password" type="password" autoComplete="current-password" required value={password} onChange={(event) => setPassword(event.target.value)} />
                </div>
                <Button type="submit" size="lg" disabled={signingIn}>{signingIn ? "Signing in…" : "Sign in securely"}</Button>
              </form>
            </CardContent>
          </Card>
        </section>
      </main>
    );
  }

  return (
    <main className="admin-page">
      <Toaster richColors position="top-right" />
      <header className="admin-header">
        <div className="admin-header-brand">
          <strong>A.</strong>
          <div><strong>Anna CMS</strong><span>Content administration</span></div>
        </div>
        <div className="admin-header-actions">
          <Button asChild variant="outline"><Link href="/" target="_blank">View site <ExternalLink /></Link></Button>
          <Button variant="ghost" onClick={handleLogout}>Sign out <LogOut /></Button>
        </div>
      </header>

      <div className="admin-main">
        <div className="admin-intro">
          <div>
            <h1>Welcome back.</h1>
            <p>Make changes here and publish them directly to Anna&apos;s website.</p>
          </div>
        </div>

        <Tabs defaultValue="page">
          <TabsList className="admin-tabs-list" variant="line">
            <TabsTrigger value="page">Main page</TabsTrigger>
            <TabsTrigger value="services">Services</TabsTrigger>
            <TabsTrigger value="articles">Journal</TabsTrigger>
          </TabsList>

          <TabsContent value="page">
            <Card className="admin-content-card">
              <CardHeader>
                <CardTitle>Website content</CardTitle>
                <CardDescription>Update Anna&apos;s main story, calls to action, and hero image.</CardDescription>
              </CardHeader>
              <CardContent className="admin-card-body">
                <div className="admin-grid-two">
                  <div className="admin-field"><Label htmlFor="brand-name">Brand name</Label><Input id="brand-name" value={content.brandName} onChange={(event) => updateContent("brandName", event.target.value)} /></div>
                  <div className="admin-field"><Label htmlFor="eyebrow">Short descriptor</Label><Input id="eyebrow" value={content.eyebrow} onChange={(event) => updateContent("eyebrow", event.target.value)} /></div>
                </div>
                <div className="admin-grid-two">
                  <div className="admin-field"><Label htmlFor="headline">Main headline</Label><Input id="headline" value={content.headline} onChange={(event) => updateContent("headline", event.target.value)} /></div>
                  <div className="admin-field"><Label htmlFor="headline-accent">Accent headline</Label><Input id="headline-accent" value={content.headlineAccent} onChange={(event) => updateContent("headlineAccent", event.target.value)} /></div>
                </div>
                <div className="admin-field"><Label htmlFor="introduction">Introduction</Label><Textarea id="introduction" rows={4} value={content.introduction} onChange={(event) => updateContent("introduction", event.target.value)} /></div>
                <div className="admin-grid-two">
                  <div className="admin-field"><Label htmlFor="statement-lead">Statement lead</Label><Input id="statement-lead" value={content.statementLead} onChange={(event) => updateContent("statementLead", event.target.value)} /></div>
                  <div className="admin-field"><Label htmlFor="statement-title">Statement title</Label><Input id="statement-title" value={content.statementTitle} onChange={(event) => updateContent("statementTitle", event.target.value)} /></div>
                </div>
                <div className="admin-field"><Label htmlFor="about-title">About title</Label><Input id="about-title" value={content.aboutTitle} onChange={(event) => updateContent("aboutTitle", event.target.value)} /></div>
                <div className="admin-field"><Label htmlFor="about-body">About Anna</Label><Textarea id="about-body" rows={6} value={content.aboutBody} onChange={(event) => updateContent("aboutBody", event.target.value)} /></div>
                <div className="admin-grid-two">
                  <div className="admin-field"><Label htmlFor="approach-title">Approach title</Label><Input id="approach-title" value={content.approachTitle} onChange={(event) => updateContent("approachTitle", event.target.value)} /></div>
                  <div className="admin-field"><Label htmlFor="approach-body">Approach description</Label><Textarea id="approach-body" rows={3} value={content.approachBody} onChange={(event) => updateContent("approachBody", event.target.value)} /></div>
                </div>
                <div className="admin-grid-two">
                  <div className="admin-field"><Label htmlFor="instagram-handle">Instagram handle</Label><Input id="instagram-handle" value={content.instagramHandle} onChange={(event) => updateContent("instagramHandle", event.target.value)} /></div>
                  <div className="admin-field"><Label htmlFor="instagram-url">Instagram URL</Label><Input id="instagram-url" type="url" value={content.instagramUrl} onChange={(event) => updateContent("instagramUrl", event.target.value)} /></div>
                </div>
                <div className="admin-grid-three">
                  <div className="admin-field"><Label htmlFor="cta-label">Button label</Label><Input id="cta-label" value={content.ctaLabel} onChange={(event) => updateContent("ctaLabel", event.target.value)} /></div>
                  <div className="admin-field"><Label htmlFor="cta-title">Contact title</Label><Input id="cta-title" value={content.ctaTitle} onChange={(event) => updateContent("ctaTitle", event.target.value)} /></div>
                  <div className="admin-field"><Label htmlFor="cta-body">Contact description</Label><Textarea id="cta-body" rows={2} value={content.ctaBody} onChange={(event) => updateContent("ctaBody", event.target.value)} /></div>
                </div>
                <div className="admin-field">
                  <Label>Hero image</Label>
                  {content.heroImageUrl ? <Image className="admin-image-preview" src={content.heroImageUrl} alt="Current hero" width={1200} height={760} unoptimized /> : null}
                  <div className="admin-upload-row"><ImageUp size={18} /><Input type="file" accept="image/*" disabled={uploading} onChange={(event) => handleHeroUpload(event.target.files?.[0])} /></div>
                  <Input aria-label="Hero image URL" value={content.heroImageUrl} onChange={(event) => updateContent("heroImageUrl", event.target.value)} />
                </div>
                <div className="admin-actions-row"><Button size="lg" onClick={saveSiteContent} disabled={saving}><Save /> {saving ? "Saving…" : "Save main page"}</Button></div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="services">
            <Card className="admin-content-card">
              <CardHeader>
                <CardTitle>Services and support areas</CardTitle>
                <CardDescription>Add, reorder, or refine the ways Anna works with people.</CardDescription>
              </CardHeader>
              <CardContent className="admin-card-body">
                <div className="admin-service-list">
                  {content.services.map((service, index) => (
                    <div className="admin-service-item" key={service.id}>
                      <div className="admin-field"><Label htmlFor={`service-title-${index}`}>Title</Label><Input id={`service-title-${index}`} value={service.title} onChange={(event) => updateService(index, "title", event.target.value)} /></div>
                      <div className="admin-field"><Label htmlFor={`service-description-${index}`}>Description</Label><Textarea id={`service-description-${index}`} rows={3} value={service.description} onChange={(event) => updateService(index, "description", event.target.value)} /></div>
                      <Button type="button" variant="ghost" size="icon" aria-label={`Remove ${service.title}`} onClick={() => removeService(index)}><Trash2 /></Button>
                    </div>
                  ))}
                </div>
                <div className="admin-actions-row">
                  <Button type="button" variant="outline" onClick={addService}><Plus /> Add service</Button>
                  <Button size="lg" onClick={saveSiteContent} disabled={saving}><Save /> {saving ? "Saving…" : "Save services"}</Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="articles">
            <div className="admin-articles-layout">
              <aside className="admin-article-list">
                <div className="admin-article-list-header"><h2>Articles</h2><Button size="sm" onClick={() => setArticleDraft(createBlankArticle())}><Plus /> New</Button></div>
                {articles.map((article) => (
                  <button className="admin-article-item" data-active={articleDraft.id === article.id} key={article.id} onClick={() => setArticleDraft(article)}>
                    <strong>{article.title}</strong>
                    <span>{article.published ? "Published" : "Draft"} · {new Date(article.publishedAt).toLocaleDateString()}</span>
                  </button>
                ))}
                {!articles.length ? <p className="text-sm text-muted-foreground">No articles yet.</p> : null}
              </aside>

              <Card className="admin-content-card">
                <CardHeader>
                  <CardTitle>{articleDraft.id ? "Edit article" : "New article"}</CardTitle>
                  <CardDescription>Write a reflection, save it as a draft, or publish it immediately.</CardDescription>
                </CardHeader>
                <CardContent className="admin-editor">
                  <div className="admin-field"><Label htmlFor="article-title">Title</Label><Input id="article-title" value={articleDraft.title} onChange={(event) => setArticleDraft((current) => ({ ...current, title: event.target.value, slug: current.id ? current.slug : slugify(event.target.value) }))} /></div>
                  <div className="admin-grid-two">
                    <div className="admin-field"><Label htmlFor="article-slug">URL slug</Label><Input id="article-slug" disabled={Boolean(articleDraft.id)} value={articleDraft.slug} onChange={(event) => setArticleDraft((current) => ({ ...current, slug: slugify(event.target.value) }))} /></div>
                    <div className="admin-field"><Label htmlFor="article-category">Category</Label><Input id="article-category" value={articleDraft.category} onChange={(event) => setArticleDraft((current) => ({ ...current, category: event.target.value }))} /></div>
                  </div>
                  <div className="admin-field"><Label htmlFor="article-excerpt">Short introduction</Label><Textarea id="article-excerpt" rows={3} value={articleDraft.excerpt} onChange={(event) => setArticleDraft((current) => ({ ...current, excerpt: event.target.value }))} /></div>
                  <div className="admin-field"><Label htmlFor="article-body">Article body</Label><Textarea id="article-body" rows={14} value={articleDraft.body} onChange={(event) => setArticleDraft((current) => ({ ...current, body: event.target.value }))} /></div>
                  <div className="admin-grid-two">
                    <div className="admin-field"><Label htmlFor="article-date">Publication date</Label><Input id="article-date" type="date" value={articleDraft.publishedAt.slice(0, 10)} onChange={(event) => setArticleDraft((current) => ({ ...current, publishedAt: event.target.value }))} /></div>
                    <div className="admin-switch-row"><div><Label htmlFor="published-switch">Published</Label><p>Visible to everyone on the website.</p></div><Switch id="published-switch" checked={articleDraft.published} onCheckedChange={(checked) => setArticleDraft((current) => ({ ...current, published: checked }))} /></div>
                  </div>
                  <div className="admin-field">
                    <Label>Cover image</Label>
                    {articleDraft.coverImageUrl ? <Image className="admin-image-preview" src={articleDraft.coverImageUrl} alt="Article cover" width={1200} height={760} unoptimized /> : null}
                    <div className="admin-upload-row"><ImageUp size={18} /><Input type="file" accept="image/*" disabled={uploading} onChange={(event) => handleArticleImage(event.target.files?.[0])} /></div>
                    <Input aria-label="Cover image URL" placeholder="Optional image URL" value={articleDraft.coverImageUrl} onChange={(event) => setArticleDraft((current) => ({ ...current, coverImageUrl: event.target.value }))} />
                  </div>
                  <div className="admin-actions-row">
                    {articleDraft.id ? (
                      <AlertDialog>
                        <AlertDialogTrigger asChild><Button variant="destructive"><Trash2 /> Delete</Button></AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader><AlertDialogTitle>Delete this article?</AlertDialogTitle><AlertDialogDescription>This permanently removes the article from Supabase and the website.</AlertDialogDescription></AlertDialogHeader>
                          <AlertDialogFooter><AlertDialogCancel>Cancel</AlertDialogCancel><AlertDialogAction variant="destructive" onClick={deleteArticle}>Delete article</AlertDialogAction></AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    ) : null}
                    <Button size="lg" onClick={saveArticle} disabled={saving}><Save /> {saving ? "Saving…" : articleDraft.published ? "Publish article" : "Save draft"}</Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </main>
  );
}
