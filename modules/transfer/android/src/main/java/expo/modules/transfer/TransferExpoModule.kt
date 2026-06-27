package expo.modules.transfer

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.content.IntentFilter
import android.util.Log
import androidx.localbroadcastmanager.content.LocalBroadcastManager
import androidx.work.OneTimeWorkRequestBuilder
import androidx.work.WorkManager
import androidx.work.WorkInfo
import androidx.work.workDataOf
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.cancel
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext
import org.json.JSONObject
import java.util.concurrent.ConcurrentHashMap

class TransferExpoModule : Module() {

  data class OngoingTransfer(val destination: String, val modelName: String, val url: String?)

  companion object {
    private const val LOG_TAG = "TransferModule"
    const val ACTION_TRANSFER_PROGRESS = "com.inferra.transfer.PROGRESS"
    const val ACTION_TRANSFER_COMPLETE = "com.inferra.transfer.COMPLETE"
    const val ACTION_TRANSFER_ERROR = "com.inferra.transfer.ERROR"
    const val ACTION_TRANSFER_CANCELLED = "com.inferra.transfer.CANCELLED"
  }

  class TransferCancelledException : Exception("Transfer was cancelled")

  private val ongoingTransfers = ConcurrentHashMap<String, OngoingTransfer>()
  private val transferScope = CoroutineScope(Dispatchers.Main + SupervisorJob())
  private var progressReceiver: BroadcastReceiver? = null

  private val transferStore by lazy {
    appContext.reactContext?.getSharedPreferences("transfer_module_store", Context.MODE_PRIVATE)
  }

  override fun definition() = ModuleDefinition {
    Name("TransferModule")

    Events(
      "onTransferProgress",
      "onTransferComplete",
      "onTransferError",
      "onTransferCancelled"
    )

    OnCreate {
      setupBroadcastReceiver()
      restoreOngoingTransfers()
    }

    OnDestroy {
      transferScope.cancel()
      progressReceiver?.let { receiver ->
        appContext.reactContext?.let {
          LocalBroadcastManager.getInstance(it).unregisterReceiver(receiver)
        }
      }
    }

    AsyncFunction("beginTransfer") { url: String, destination: String, headers: Map<String, String>? ->
      val context = appContext.reactContext
        ?: throw Exception("Context not available")

      val transferId = System.currentTimeMillis().toString()
      val modelName = extractModelName(destination) ?: transferId

      val headersString = headers?.entries?.joinToString(", ", "{", "}") { "${it.key}=${it.value}" }

      val inputData = workDataOf(
        FileTransferWorker.KEY_URL to url,
        FileTransferWorker.KEY_DESTINATION to destination,
        FileTransferWorker.KEY_TRANSFER_ID to transferId,
        FileTransferWorker.KEY_HEADERS to (headersString ?: ""),
        FileTransferWorker.KEY_MODEL_NAME to modelName
      )

      val transferRequest = OneTimeWorkRequestBuilder<FileTransferWorker>()
        .setInputData(inputData)
        .addTag(transferId)
        .addTag(FileTransferWorker.WORK_TAG)
        .build()

      WorkManager.getInstance(context).enqueue(transferRequest)

      val transferInfo = OngoingTransfer(destination, modelName, url)
      ongoingTransfers[transferId] = transferInfo
      storeTransfer(transferId, transferInfo)

      mapOf("transferId" to transferId)
    }

    AsyncFunction("cancelTransfer") { transferId: String ->
      val context = appContext.reactContext
        ?: throw Exception("Context not available")
      WorkManager.getInstance(context).cancelAllWorkByTag(transferId)
      ongoingTransfers.remove(transferId)
      removeStoredTransfer(transferId)
      true
    }

    AsyncFunction("getOngoingTransfers") {
      val context = appContext.reactContext
        ?: throw Exception("Context not available")

      val workManager = WorkManager.getInstance(context)
      val workInfos = workManager.getWorkInfosByTag(FileTransferWorker.WORK_TAG).get()

      val result = mutableListOf<Map<String, Any?>>()

      for (workInfo in workInfos) {
        if (workInfo.state.isFinished) continue

        val transferId = workInfo.tags.firstOrNull { it != FileTransferWorker.WORK_TAG && it != FileTransferWorker::class.java.name } ?: continue
        val storedTransfer = ongoingTransfers[transferId]
          ?: readStoredTransfer(transferId)
          ?: OngoingTransfer("", transferId, null)

        val destination = storedTransfer.destination
        val modelName = storedTransfer.modelName.ifEmpty {
          extractModelName(destination) ?: transferId
        }
        val url = storedTransfer.url

        val progressData = workInfo.progress
        val bytesWritten = progressData.getLong(FileTransferWorker.KEY_PROGRESS_BYTES, 0L)
        val totalBytes = progressData.getLong(FileTransferWorker.KEY_PROGRESS_TOTAL, 0L)
        val progressPercent = progressData.getInt(FileTransferWorker.KEY_PROGRESS_PERCENT, 0)

        val transferInfo = mutableMapOf<String, Any?>(
          "id" to transferId,
          "destination" to destination,
          "modelName" to modelName,
          "bytesWritten" to bytesWritten.toDouble(),
          "totalBytes" to totalBytes.toDouble(),
          "progress" to progressPercent,
        )
        url?.let { transferInfo["url"] = it }

        ongoingTransfers[transferId] = OngoingTransfer(destination, modelName, url)
        result.add(transferInfo)
      }

      result
    }
  }

  private fun extractModelName(path: String?): String? {
    if (path.isNullOrEmpty()) return null
    val normalised = if (path.startsWith("file://")) path.substring(7) else path
    return normalised.split('/').filter { it.isNotEmpty() }.lastOrNull()
  }

  private fun storeTransfer(transferId: String, transfer: OngoingTransfer) {
    val data = JSONObject().apply {
      put("destination", transfer.destination)
      put("modelName", transfer.modelName)
      put("url", transfer.url)
    }.toString()
    transferStore?.edit()?.putString(transferId, data)?.apply()
  }

  private fun readStoredTransfer(transferId: String): OngoingTransfer? {
    val data = transferStore?.getString(transferId, null) ?: return null
    return try {
      val obj = JSONObject(data)
      OngoingTransfer(
        obj.optString("destination", ""),
        obj.optString("modelName", transferId),
        if (obj.isNull("url")) null else obj.optString("url", null)
      )
    } catch (_: Exception) { null }
  }

  private fun removeStoredTransfer(transferId: String) {
    transferStore?.edit()?.remove(transferId)?.apply()
  }

  private fun restoreOngoingTransfers() {
    transferScope.launch(Dispatchers.IO) {
      try {
        val context = appContext.reactContext ?: return@launch
        val workManager = WorkManager.getInstance(context)
        val workInfos = workManager.getWorkInfosByTag(FileTransferWorker.WORK_TAG).get()
        val activeIds = mutableSetOf<String>()

        for (info in workInfos) {
          if (info.state.isFinished) continue
          val transferId = info.tags.firstOrNull { it != FileTransferWorker.WORK_TAG && it != FileTransferWorker::class.java.name } ?: continue
          activeIds += transferId
          val stored = readStoredTransfer(transferId) ?: OngoingTransfer("", transferId, null)
          ongoingTransfers[transferId] = stored
        }

        val store = transferStore ?: return@launch
        if (store.all.isNotEmpty()) {
          val editor = store.edit()
          var modified = false
          for (entry in store.all.keys) {
            if (!activeIds.contains(entry)) {
              editor.remove(entry)
              modified = true
            }
          }
          if (modified) editor.apply()
        }
      } catch (e: Exception) {
        Log.w(LOG_TAG, "restore_failed", e)
      }
    }
  }

  private fun setupBroadcastReceiver() {
    val context = appContext.reactContext ?: return

    progressReceiver = object : BroadcastReceiver() {
      override fun onReceive(ctx: Context?, intent: Intent?) {
        when (intent?.action) {
          ACTION_TRANSFER_PROGRESS -> {
            val transferId = intent.getStringExtra("transferId") ?: return
            val bytesWritten = intent.getLongExtra("bytesWritten", 0)
            val totalBytes = intent.getLongExtra("totalBytes", 0)
            val speed = intent.getLongExtra("speed", 0)
            val progress = intent.getIntExtra("progress", 0)
            val modelName = intent.getStringExtra("modelName")
            val destination = intent.getStringExtra("destination")
            val url = intent.getStringExtra("url")

            val info = ongoingTransfers[transferId]
            val resolvedName = modelName ?: info?.modelName ?: extractModelName(destination) ?: transferId
            val resolvedDest = destination ?: info?.destination ?: ""
            val resolvedUrl = url ?: info?.url

            sendEvent("onTransferProgress", mapOf(
              "downloadId" to transferId,
              "modelName" to resolvedName,
              "destination" to resolvedDest,
              "url" to resolvedUrl,
              "bytesWritten" to bytesWritten.toDouble(),
              "totalBytes" to totalBytes.toDouble(),
              "speed" to speed.toDouble(),
              "eta" to if (speed > 0) (totalBytes - bytesWritten).toDouble() / speed else 0.0,
              "progress" to progress,
            ))
          }
          ACTION_TRANSFER_COMPLETE -> {
            val transferId = intent.getStringExtra("transferId") ?: return
            val modelName = intent.getStringExtra("modelName")
            val destination = intent.getStringExtra("destination")
            val url = intent.getStringExtra("url")
            val bytesWritten = intent.getLongExtra("bytesWritten", 0)
            val totalBytes = intent.getLongExtra("totalBytes", bytesWritten)

            val info = ongoingTransfers.remove(transferId)
            val resolvedName = modelName ?: info?.modelName ?: extractModelName(destination) ?: transferId
            val resolvedDest = destination ?: info?.destination
            val resolvedUrl = url ?: info?.url
            removeStoredTransfer(transferId)

            sendEvent("onTransferComplete", mapOf(
              "downloadId" to transferId,
              "modelName" to resolvedName,
              "destination" to resolvedDest,
              "url" to resolvedUrl,
              "bytesWritten" to bytesWritten.toDouble(),
              "totalBytes" to totalBytes.toDouble(),
            ))
          }
          ACTION_TRANSFER_ERROR -> {
            val transferId = intent.getStringExtra("transferId") ?: return
            val error = intent.getStringExtra("error") ?: "Unknown error"
            val modelName = intent.getStringExtra("modelName")
            val destination = intent.getStringExtra("destination")
            val url = intent.getStringExtra("url")
            val bytesWritten = intent.getLongExtra("bytesWritten", 0)
            val totalBytes = intent.getLongExtra("totalBytes", 0)

            val info = ongoingTransfers.remove(transferId)
            val resolvedName = modelName ?: info?.modelName ?: extractModelName(destination) ?: transferId
            val resolvedDest = destination ?: info?.destination
            val resolvedUrl = url ?: info?.url
            removeStoredTransfer(transferId)

            sendEvent("onTransferError", mapOf(
              "downloadId" to transferId,
              "error" to error,
              "modelName" to resolvedName,
              "destination" to resolvedDest,
              "url" to resolvedUrl,
              "bytesWritten" to bytesWritten.toDouble(),
              "totalBytes" to totalBytes.toDouble(),
            ))
          }
          ACTION_TRANSFER_CANCELLED -> {
            val transferId = intent.getStringExtra("transferId") ?: return
            val modelName = intent.getStringExtra("modelName")
            val destination = intent.getStringExtra("destination")
            val url = intent.getStringExtra("url")
            val bytesWritten = intent.getLongExtra("bytesWritten", 0)
            val totalBytes = intent.getLongExtra("totalBytes", 0)

            val info = ongoingTransfers.remove(transferId)
            val resolvedName = modelName ?: info?.modelName ?: extractModelName(destination) ?: transferId
            val resolvedDest = destination ?: info?.destination
            val resolvedUrl = url ?: info?.url
            removeStoredTransfer(transferId)

            sendEvent("onTransferCancelled", mapOf(
              "modelName" to resolvedName,
              "destination" to resolvedDest,
              "url" to resolvedUrl,
              "bytesWritten" to bytesWritten.toDouble(),
              "totalBytes" to totalBytes.toDouble(),
            ))
          }
        }
      }
    }

    val intentFilter = IntentFilter().apply {
      addAction(ACTION_TRANSFER_PROGRESS)
      addAction(ACTION_TRANSFER_COMPLETE)
      addAction(ACTION_TRANSFER_ERROR)
      addAction(ACTION_TRANSFER_CANCELLED)
    }

    LocalBroadcastManager.getInstance(context)
      .registerReceiver(progressReceiver!!, intentFilter)
  }
}
