package expo.modules.transfer

import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition

class DownloadNotificationModule : Module() {
  private val notificationNames = mutableMapOf<String, String>()

  override fun definition() = ModuleDefinition {
    Name("DownloadNotification")

    AsyncFunction("setCopy") { copy: Map<String, String> ->
      DownloadNotificationHelper.setCopy(copy)
      true
    }

    AsyncFunction("requestPermissions") {
      true
    }

    AsyncFunction("showDownloadNotification") { modelName: String, downloadId: String, progress: Double, bytesDownloaded: Double, totalBytes: Double ->
      val context = appContext.reactContext
        ?: throw Exception("Context not available")
      notificationNames[downloadId] = modelName
      DownloadNotificationHelper.notifyProgress(
        context,
        downloadId,
        modelName,
        progress.toInt().coerceIn(0, 100),
        bytesDownloaded.toLong(),
        totalBytes.toLong(),
      )
      true
    }

    AsyncFunction("updateDownloadProgress") { downloadId: String, progress: Double, bytesDownloaded: Double, totalBytes: Double, modelName: String ->
      val context = appContext.reactContext
        ?: throw Exception("Context not available")
      val name = notificationNames[downloadId] ?: modelName
      notificationNames[downloadId] = name
      DownloadNotificationHelper.notifyProgress(
        context,
        downloadId,
        name,
        progress.toInt().coerceIn(0, 100),
        bytesDownloaded.toLong(),
        totalBytes.toLong(),
      )
      true
    }

    AsyncFunction("cancelNotification") { downloadId: String ->
      val context = appContext.reactContext
        ?: throw Exception("Context not available")
      DownloadNotificationHelper.cancelNotification(context, downloadId)
      notificationNames.remove(downloadId)
      true
    }
  }
}
