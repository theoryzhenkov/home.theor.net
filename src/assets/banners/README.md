# Banners

Drop banner images here, then reference them from a page's frontmatter by
filename:

```yaml
banner: my-banner.jpg
bannerAlt: Short description of the image
bannerCaption: Optional caption shown beneath the banner
```

Any size/aspect ratio works — at build time the image is center-cropped and
resized to a fixed 1500×500 (3:1) WebP, so all banners ship at identical
dimensions. Provide a source at least 1500×500; larger is fine (it is cropped
down). Images smaller than the target are not upscaled.
