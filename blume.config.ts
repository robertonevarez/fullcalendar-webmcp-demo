import { defineConfig } from "blume";

export default defineConfig({
  title: "Protocol Tooling",
  description:
    "Agent-native scheduling infrastructure for service businesses, exposed through WebMCP.",
  deployment: {
    site: "https://protocoltooling.com",
    output: "static",
  },
  github: {
    owner: "robertonevarez",
    repo: "protocoltooling",
    branch: "main",
  },
  navigation: {
    repo: true,
    tabs: [
      { label: "Docs", path: "/getting-started/overview" },
      { label: "WebMCP", path: "/webmcp/overview" },
      { label: "Tools", path: "/tools/overview" },
      { label: "API Reference", path: "/api/overview" },
      { label: "Architecture", path: "/architecture/booking-service" },
      { label: "Guides", path: "/guides/add-protocol-tooling-to-a-business" },
      { label: "Examples", path: "/examples/acme-hvac" },
    ],
  },
  ai: {
    llmsTxt: true,
    openInChat: ["claude", "chatgpt", "cursor"],
    webmcp: true,
  },
  openapi: {
    enabled: true,
    route: "/api/reference",
    spec: "./public/openapi.json",
  },
});
