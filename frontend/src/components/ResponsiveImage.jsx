export default function ResponsiveImage({ article, ...props }) {
  const variants = article.cover_image_variants ?? []
  const usable = variants.filter((item) => item.url && item.width > 0)
  return (
    <img
      src={article.cover_image_url}
      srcSet={
        usable.length > 1
          ? usable.map((item) => `${item.url} ${item.width}w`).join(', ')
          : undefined
      }
      sizes="(max-width: 700px) 100vw, (max-width: 1100px) 50vw, 1000px"
      {...props}
    />
  )
}
