import {
  createWebSearchProviderContractFields,
  type WebSearchProviderPlugin,
} from "littlebaby/plugin-sdk/provider-web-search-contract";

export function createDuckDuckGoWebSearchProvider(): WebSearchProviderPlugin {
  return {
    id: "duckduckgo",
    label: "DuckDuckGo Search (experimental)",
    hint: "Free web search fallback with no API key required",
    requiresCredential: false,
    envVars: [],
    placeholder: "(no key needed)",
    signupUrl: "https://duckduckgo.com/",
    docsUrl: "https://docs.littlebaby.ai/tools/web",
    autoDetectOrder: 100,
    credentialPath: "",
    ...createWebSearchProviderContractFields({
      credentialPath: "",
      searchCredential: { type: "scoped", scopeId: "duckduckgo" },
      selectionPluginId: "duckduckgo",
    }),
    createTool: () => null,
  };
}
