/*
  PdfDoc - Internal helper wrapping Android PdfRenderer.
  Handles loading from content://, file://, http(s)://, data: URIs and raw paths.
  Caches rendered page images on disk as PNGs.
*/

package expo.modules.pdfimage

import android.content.ContentResolver
import android.content.Context
import android.graphics.Bitmap
import android.graphics.Canvas
import android.graphics.Color
import android.graphics.pdf.PdfRenderer
import android.net.Uri
import android.os.ParcelFileDescriptor
import android.util.Base64
import java.io.File
import java.io.FileOutputStream
import java.io.IOException
import java.net.URL
import java.util.UUID

class PdfDoc(private val context: Context, private val uriString: String) {
  private val descriptor: ParcelFileDescriptor
  private val renderer: PdfRenderer
  private val pageCache = HashMap<String, Map<String, Any>>()

  init {
    val fd = openDescriptor(uriString) ?: throw IOException("Cannot open: $uriString")
    descriptor = fd
    renderer = PdfRenderer(fd)
  }

  fun pageCount(): Int = renderer.pageCount

  fun renderPage(page: Int, scale: Float): Map<String, Any> {
    val key = "$page:$scale"
    pageCache[key]?.let { return it }

    if (page < 0 || page >= renderer.pageCount) {
      throw RuntimeException("Page $page invalid, document has ${renderer.pageCount} pages")
    }

    val current = renderer.openPage(page)
    val w = (current.width * scale).toInt()
    val h = (current.height * scale).toInt()
    val bitmap = Bitmap.createBitmap(w, h, Bitmap.Config.ARGB_8888)

    val canvas = Canvas(bitmap)
    canvas.drawColor(Color.WHITE)

    current.render(bitmap, null, null, PdfRenderer.Page.RENDER_MODE_FOR_DISPLAY)
    current.close()

    val outFile = outputFile()
    FileOutputStream(outFile).use { out ->
      bitmap.compress(Bitmap.CompressFormat.PNG, 100, out)
    }

    val result = mapOf(
      "uri" to Uri.fromFile(outFile).toString(),
      "width" to w,
      "height" to h
    )
    pageCache[key] = result
    return result
  }

  fun cleanup() {
    pageCache.values.forEach { entry ->
      try {
        val path = Uri.parse(entry["uri"] as? String).path
        if (path != null) File(path).delete()
      } catch (_: Exception) {}
    }
    pageCache.clear()
    descriptor.close()
    renderer.close()
  }

  private fun outputFile(): File {
    return File.createTempFile(UUID.randomUUID().toString(), ".png", context.cacheDir)
  }

  private fun openDescriptor(uri: String): ParcelFileDescriptor? {
    val parsed = Uri.parse(uri)
    return when {
      parsed.scheme in listOf(ContentResolver.SCHEME_CONTENT, ContentResolver.SCHEME_FILE) ->
        context.contentResolver.openFileDescriptor(parsed, "r")

      uri.startsWith("/") -> {
        val file = File(uri)
        ParcelFileDescriptor.open(file, ParcelFileDescriptor.MODE_READ_ONLY)
      }

      parsed.scheme in listOf("http", "https") -> {
        val tmp = download(uri) ?: return null
        ParcelFileDescriptor.open(tmp, ParcelFileDescriptor.MODE_READ_ONLY)
      }

      uri.startsWith("data:") -> {
        val b64 = uri.substringAfter(",")
        val bytes = Base64.decode(b64, Base64.DEFAULT)
        val tmp = File.createTempFile(UUID.randomUUID().toString(), ".pdf", context.cacheDir)
        tmp.deleteOnExit()
        FileOutputStream(tmp).use { it.write(bytes) }
        ParcelFileDescriptor.open(tmp, ParcelFileDescriptor.MODE_READ_ONLY)
      }

      else -> null
    }
  }

  private fun download(url: String): File? {
    return try {
      val conn = URL(url).openConnection()
      conn.connect()
      val tmp = File.createTempFile(UUID.randomUUID().toString(), ".pdf", context.cacheDir)
      tmp.deleteOnExit()
      FileOutputStream(tmp).use { out -> conn.getInputStream().copyTo(out) }
      tmp
    } catch (_: Exception) {
      null
    }
  }
}
