import { AwsClient } from "aws4fetch"

function getEnvValue(name: string) {
  if (typeof process !== "undefined") {
    return process.env?.[name]
  }
}

function getRequiredEnv(name: string) {
  const value = getEnvValue(name)
  if (!value) throw new Error(`${name} environment variable is not set`)
  return value
}

const getRegion = () => getEnvValue("AWS_REGION") || "ap-southeast-1"

export function getPublicS3Url(key: string) {
  const bucket = getEnvValue("S3_BUCKET_NAME") || "dialisis.my"
  return `https://s3.${getRegion()}.amazonaws.com/${bucket}/${key}`
}

async function s3Fetch(key: string, init: RequestInit) {
  const client = new AwsClient({
    accessKeyId: getRequiredEnv("AWS_ACCESS_KEY_ID"),
    secretAccessKey: getRequiredEnv("AWS_SECRET_ACCESS_KEY"),
    sessionToken: getEnvValue("AWS_SESSION_TOKEN"),
    service: "s3",
    region: getRegion(),
  })
  const response = await client.fetch(getPublicS3Url(key), init)
  if (!response.ok) {
    throw new Error(`S3 ${init.method} failed (${response.status})`)
  }
}

export function putS3Object(key: string, body: ArrayBuffer, contentType: string) {
  return s3Fetch(key, {
    method: "PUT",
    body,
    headers: {
      "content-type": contentType,
      "cache-control": "max-age=31536000",
    },
  })
}

export function deleteS3Object(key: string) {
  return s3Fetch(key, { method: "DELETE" })
}
