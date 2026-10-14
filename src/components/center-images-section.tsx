import { useRef } from "react"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"
import { ArrowDown, ArrowUp, ImageIcon, Trash2, Upload } from "lucide-react"
import {
  deleteCenterImage,
  getCenterImages,
  reorderCenterImages,
  uploadCenterImage,
} from "@/core/functions/image-functions"
import { ProBadge } from "@/components/pro-badge"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { defineCopy, useCopy } from "@/lib/i18n"

const COPY = defineCopy({
  en: {
    images: "Photos",
    imagesDescription:
      "Shown on the centre page. The first photo is the cover. Changes can take up to an hour to appear.",
    proHint: "Available on the Pro plan.",
    upload: "Upload photos",
    uploading: "Uploading...",
    uploaded: (count: number) => `${count} photo${count === 1 ? "" : "s"} uploaded`,
    uploadFailed: "Failed to upload photo",
    empty: "No photos yet.",
    cover: "Cover",
    moveUp: "Move up",
    moveDown: "Move down",
    reorderFailed: "Failed to reorder photos",
    remove: "Remove photo",
    removeTitle: "Remove this photo?",
    removeDescription: "It will be removed from the public site.",
    cancel: "Cancel",
    removed: "Photo removed",
    removeFailed: "Failed to remove photo",
  },
  ms: {
    images: "Gambar",
    imagesDescription:
      "Dipaparkan di halaman pusat. Gambar pertama ialah gambar utama. Perubahan mungkin mengambil masa sehingga sejam untuk dipaparkan.",
    proHint: "Tersedia dengan pelan Pro.",
    upload: "Muat naik gambar",
    uploading: "Memuat naik...",
    uploaded: (count: number) => `${count} gambar dimuat naik`,
    uploadFailed: "Gagal memuat naik gambar",
    empty: "Belum ada gambar.",
    cover: "Utama",
    moveUp: "Alih ke atas",
    moveDown: "Alih ke bawah",
    reorderFailed: "Gagal menyusun semula gambar",
    remove: "Buang gambar",
    removeTitle: "Buang gambar ini?",
    removeDescription: "Gambar ini akan dibuang dari laman awam.",
    cancel: "Batal",
    removed: "Gambar dibuang",
    removeFailed: "Gagal membuang gambar",
  },
})

const MAX_WIDTH = 1200
const MAX_HEIGHT = 800

async function toJpeg(file: File) {
  const bitmap = await createImageBitmap(file)
  const scale = Math.min(1, MAX_WIDTH / bitmap.width, MAX_HEIGHT / bitmap.height)
  const canvas = document.createElement("canvas")
  canvas.width = Math.round(bitmap.width * scale)
  canvas.height = Math.round(bitmap.height * scale)
  canvas.getContext("2d")!.drawImage(bitmap, 0, 0, canvas.width, canvas.height)
  bitmap.close()
  const blob = await new Promise<Blob | null>((resolve) =>
    canvas.toBlob(resolve, "image/jpeg", 0.85)
  )
  if (!blob) throw new Error("Could not read image")
  return new File([blob], "image.jpg", { type: "image/jpeg" })
}

export function CenterImagesSection({
  centerId,
  locked,
}: {
  centerId: string
  locked: boolean
}) {
  const queryClient = useQueryClient()
  const t = useCopy(COPY)
  const inputRef = useRef<HTMLInputElement>(null)
  const queryKey = ["images", centerId]

  const { data: images = [] } = useQuery({
    queryKey,
    queryFn: () => getCenterImages({ data: { centerId } }),
  })

  const invalidateImages = () => queryClient.invalidateQueries({ queryKey })

  const uploadMutation = useMutation({
    mutationFn: async (files: File[]) => {
      for (const file of files) {
        const formData = new FormData()
        formData.append("centerId", centerId)
        formData.append("image", await toJpeg(file))
        await uploadCenterImage({ data: formData })
      }
      return files.length
    },
    onSuccess: (count) => toast.success(t.uploaded(count)),
    onError: (error) => toast.error(error.message || t.uploadFailed),
    onSettled: invalidateImages,
  })

  const reorderMutation = useMutation({
    mutationFn: (imageIds: string[]) =>
      reorderCenterImages({ data: { centerId, imageIds } }),
    onError: (error) => toast.error(error.message || t.reorderFailed),
    onSettled: invalidateImages,
  })

  const deleteMutation = useMutation({
    mutationFn: (imageId: string) => deleteCenterImage({ data: { imageId } }),
    onSuccess: () => toast.success(t.removed),
    onError: (error) => toast.error(error.message || t.removeFailed),
    onSettled: invalidateImages,
  })

  const move = (from: number, to: number) => {
    const ids = images.map((image) => image.id)
    ;[ids[from], ids[to]] = [ids[to], ids[from]]
    queryClient.setQueryData(
      queryKey,
      ids.map((id) => images.find((image) => image.id === id)!)
    )
    reorderMutation.mutate(ids)
  }

  const busy = uploadMutation.isPending || reorderMutation.isPending || deleteMutation.isPending

  return (
    <Card>
      <CardHeader className="px-4 py-4 sm:px-6">
        <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
          <ImageIcon className="size-5 text-primary" />
          {t.images}
          {locked && <ProBadge title={t.proHint} />}
        </CardTitle>
        <CardDescription>{locked ? t.proHint : t.imagesDescription}</CardDescription>
      </CardHeader>
      <CardContent className="px-4 pb-4 sm:px-6 sm:pb-6">
        <fieldset disabled={locked || busy} className="min-w-0 space-y-4">
          {images.length > 0 ? (
            <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              {images.map((image, index) => (
                <li key={image.id} className="overflow-hidden rounded-lg border">
                  <div className="relative aspect-[3/2] bg-muted">
                    <img
                      src={image.url}
                      alt=""
                      loading="lazy"
                      className="size-full object-cover"
                    />
                    {index === 0 && (
                      <span className="absolute left-2 top-2 rounded-md bg-background/90 px-2 py-0.5 text-xs font-medium">
                        {t.cover}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center justify-between gap-1 p-1.5">
                    <div className="flex gap-1">
                      <Button
                        type="button"
                        size="icon"
                        variant="ghost"
                        className="size-9"
                        aria-label={t.moveUp}
                        disabled={index === 0}
                        onClick={() => move(index, index - 1)}
                      >
                        <ArrowUp className="size-4" />
                      </Button>
                      <Button
                        type="button"
                        size="icon"
                        variant="ghost"
                        className="size-9"
                        aria-label={t.moveDown}
                        disabled={index === images.length - 1}
                        onClick={() => move(index, index + 1)}
                      >
                        <ArrowDown className="size-4" />
                      </Button>
                    </div>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button
                          type="button"
                          size="icon"
                          variant="ghost"
                          className="size-9 text-destructive hover:text-destructive"
                          aria-label={t.remove}
                        >
                          <Trash2 className="size-4" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>{t.removeTitle}</AlertDialogTitle>
                          <AlertDialogDescription>{t.removeDescription}</AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>{t.cancel}</AlertDialogCancel>
                          <AlertDialogAction onClick={() => deleteMutation.mutate(image.id)}>
                            {t.remove}
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-muted-foreground">{t.empty}</p>
          )}

          <input
            ref={inputRef}
            type="file"
            accept="image/*"
            multiple
            className="hidden"
            onChange={(e) => {
              const files = Array.from(e.target.files ?? [])
              e.target.value = ""
              if (files.length) uploadMutation.mutate(files)
            }}
          />
          <Button
            type="button"
            variant="outline"
            className="h-11 gap-2"
            onClick={() => inputRef.current?.click()}
          >
            <Upload className="size-4" />
            {uploadMutation.isPending ? t.uploading : t.upload}
          </Button>
        </fieldset>
      </CardContent>
    </Card>
  )
}
