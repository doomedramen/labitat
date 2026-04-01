import type { ServiceDefinition } from "./types"

type LogoData = {
  _status?: "ok" | "warn" | "error" | "none"
  _statusText?: string
  imageUrl: string
  linkUrl?: string
  altText?: string
}

function LogoWidget({ imageUrl, linkUrl, altText }: LogoData) {
  const content = (
    <div className="flex items-center justify-center py-2">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={imageUrl}
        alt={altText || "Logo"}
        className="max-h-16 w-auto object-contain"
      />
    </div>
  )

  if (linkUrl) {
    return (
      <a
        href={linkUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="block"
      >
        {content}
      </a>
    )
  }

  return content
}

export const logoDefinition: ServiceDefinition<LogoData> = {
  id: "logo",
  name: "Logo",
  icon: "image",
  category: "info",
  defaultPollingMs: undefined, // No polling needed - static widget

  configFields: [
    {
      key: "imageUrl",
      label: "Image URL",
      type: "url",
      required: true,
      placeholder: "https://example.com/logo.png",
      helperText: "URL to your logo or image",
    },
    {
      key: "linkUrl",
      label: "Link URL (optional)",
      type: "url",
      required: false,
      placeholder: "https://example.com",
      helperText: "Make the logo clickable (optional)",
    },
    {
      key: "altText",
      label: "Alt Text (optional)",
      type: "text",
      required: false,
      placeholder: "My Logo",
      helperText: "Accessible alt text for the image",
    },
  ],

  async fetchData(config) {
    const { imageUrl, linkUrl, altText } = config

    if (!imageUrl) {
      throw new Error("Image URL is required")
    }

    return {
      _status: "none" as const, // Static widget - no status
      imageUrl,
      linkUrl: linkUrl || undefined,
      altText: altText || "Logo",
    }
  },

  Widget: LogoWidget,
}
