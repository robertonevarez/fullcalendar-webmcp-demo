export function shouldResetFromSearch(search: string): boolean {
  const params = new URLSearchParams(
    search.startsWith("?") ? search.slice(1) : search,
  );
  return params.get("reset") === "1";
}

export function stripResetParam(href: string): string {
  const url = new URL(href, "http://localhost");
  url.searchParams.delete("reset");
  return `${url.pathname}${url.search}${url.hash}`;
}
