export function getBuildLabel(): string {
  const version = process.env.NEXT_PUBLIC_APP_VERSION?.trim() || 'dev'
  const stamp = process.env.NEXT_PUBLIC_BUILD_STAMP?.trim()

  return stamp ? `v${version} · ${stamp}` : `v${version}`
}
