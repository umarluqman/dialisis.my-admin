export function triggerAmplifyDeploy() {
  const url = process.env.AMPLIFY_WEBHOOK_URL
  if (!url) return

  void fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({}),
  }).catch(console.error)
}
