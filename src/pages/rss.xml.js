import rss from '@astrojs/rss';

export async function GET(context) {
  const posts = Object.values(
    import.meta.glob('./articles/*.md', { eager: true })
  );

  return rss({
    title: 'Footy Analytics',
    description: 'Football modeling tutorials, notes, and tools.',
    site: context.site,
    items: posts.map((p) => {
      const fm = p.frontmatter ?? {};
      const title = fm.title ?? (p.file?.split('/').pop()?.replace('.md','') ?? 'Untitled');
      return {
        title,
        description: fm.description ?? '',
        link: p.url,
        pubDate: fm.date ? new Date(fm.date) : new Date(),
      };
    }),
    customData: `<language>en</language>`,
  });
}
