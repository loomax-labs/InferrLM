/*
  iOS native transfer module using URLSession background downloads.
  Manages file downloads that survive app reloads and backgrounding
  by using a persistent background URLSession identifier and UserDefaults
  metadata store. Emits progress/completion/error/cancellation events
  matching the Android TransferModule API.
*/

import ExpoModulesCore
import Foundation
import os.log

private let logger = OSLog(subsystem: "com.inferra.transfer", category: "TransferModule")

private struct TransferMeta: Codable {
  let transferId: String
  let destination: String
  let modelName: String
  let url: String
}

public class TransferModule: Module {
  static let sessionId = "com.inferra.bgdownload"
  private static let storeKey = "transfer_module_meta"

  private lazy var session: URLSession = {
    let config = URLSessionConfiguration.background(withIdentifier: Self.sessionId)
    config.isDiscretionary = false
    config.sessionSendsLaunchEvents = true
    config.allowsCellularAccess = true
    config.waitsForConnectivity = false
    if #available(iOS 13.0, *) {
      config.allowsExpensiveNetworkAccess = true
      config.allowsConstrainedNetworkAccess = true
    }
    return URLSession(configuration: config, delegate: delegate, delegateQueue: nil)
  }()

  private let delegate = SessionDelegate()
  private var meta: [String: TransferMeta] = [:]
  private let metaLock = NSLock()

  public func definition() -> ModuleDefinition {
    Name("TransferModule")

    Events(
      "onTransferProgress",
      "onTransferComplete",
      "onTransferError",
      "onTransferCancelled"
    )

    OnCreate {
      self.delegate.module = self
      self.loadMeta()
      self.reconnect()
    }

    AsyncFunction("beginTransfer") {
      (url: String, destination: String, headers: [String: String]?) -> [String: Any] in

      guard let downloadUrl = URL(string: url) else {
        throw NSError(domain: "TransferModule", code: 1,
                      userInfo: [NSLocalizedDescriptionKey: "invalid_url"])
      }

      let transferId = UUID().uuidString
      let modelName = Self.extractModelName(destination) ?? transferId

      var request = URLRequest(url: downloadUrl)
      request.cachePolicy = .reloadIgnoringLocalCacheData
      if #available(iOS 12.0, *) {
        request.networkServiceType = .responsiveData
      }
      if #available(iOS 13.0, *) {
        request.allowsExpensiveNetworkAccess = true
        request.allowsConstrainedNetworkAccess = true
      }
      headers?.forEach { request.setValue($1, forHTTPHeaderField: $0) }

      let task = self.session.downloadTask(with: request)
      task.taskDescription = transferId
      task.priority = URLSessionTask.highPriority
      task.resume()

      let entry = TransferMeta(
        transferId: transferId, destination: destination,
        modelName: modelName, url: url
      )
      self.setMeta(transferId, entry)

      return ["transferId": transferId]
    }

    AsyncFunction("cancelTransfer") { (transferId: String) -> Bool in
      self.session.getTasksWithCompletionHandler { _, _, downloadTasks in
        for task in downloadTasks where task.taskDescription == transferId {
          task.cancel()
        }
        self.removeMeta(transferId)
      }
      return true
    }

    AsyncFunction("getOngoingTransfers") { () -> [[String: Any]] in
      return await withCheckedContinuation { continuation in
        self.session.getTasksWithCompletionHandler { _, _, downloadTasks in
          var result: [[String: Any]] = []
          for task in downloadTasks {
            guard let tid = task.taskDescription else { continue }
            if task.state == .completed || task.state == .canceling { continue }

            let stored = self.getMeta(tid)
            let modelName = stored?.modelName ?? Self.extractModelName(stored?.destination) ?? tid
            let bytesWritten = task.countOfBytesReceived
            let totalBytes = task.countOfBytesExpectedToReceive
            let progress = totalBytes > 0
              ? min(Int(Double(bytesWritten) / Double(totalBytes) * 100), 100)
              : 0

            var entry: [String: Any] = [
              "id": tid,
              "destination": stored?.destination ?? "",
              "modelName": modelName,
              "bytesWritten": Double(bytesWritten),
              "totalBytes": Double(max(totalBytes, 0)),
              "progress": progress
            ]
            if let u = stored?.url { entry["url"] = u }
            result.append(entry)
          }
          continuation.resume(returning: result)
        }
      }
    }
  }

  /* Event emitters called by the delegate */

  func emitProgress(_ tid: String, bytesWritten: Int64, totalBytes: Int64) {
    let t0 = CFAbsoluteTimeGetCurrent()
    let stored = getMeta(tid)
    let modelName = stored?.modelName ?? tid
    let progress = totalBytes > 0
      ? min(Int(Double(bytesWritten) / Double(totalBytes) * 100), 100)
      : 0

    sendEvent("onTransferProgress", [
      "downloadId": tid,
      "modelName": modelName,
      "destination": stored?.destination ?? "",
      "url": stored?.url ?? "",
      "bytesWritten": Double(bytesWritten),
      "totalBytes": Double(max(totalBytes, 0)),
      "speed": 0.0,
      "eta": 0.0,
      "progress": progress
    ])

    let ms = Int((CFAbsoluteTimeGetCurrent() - t0) * 1000)
    os_log(.info, log: logger, "progress_evt model=%{public}@ pct=%d bytes=%lld/%lld tx=%dms",
           modelName, progress, bytesWritten, totalBytes, ms)
  }

  func emitComplete(_ tid: String, location: URL) {
    let stored = getMeta(tid)
    let modelName = stored?.modelName ?? tid
    let dest = stored?.destination ?? ""

    if !dest.isEmpty {
      let destURL = Self.resolveDestinationURL(dest)
      let dir = destURL.deletingLastPathComponent()
      try? FileManager.default.createDirectory(at: dir, withIntermediateDirectories: true)
      try? FileManager.default.removeItem(at: destURL)
      do {
        try FileManager.default.moveItem(at: location, to: destURL)
      } catch {
        sendEvent("onTransferError", [
          "downloadId": tid,
          "modelName": modelName,
          "destination": dest,
          "error": "move_failed: \(error.localizedDescription)"
        ])
        removeMeta(tid)
        return
      }
    }

    let finalPath = dest.isEmpty ? dest : Self.resolveDestinationURL(dest).path
    let size = (try? FileManager.default.attributesOfItem(atPath: finalPath))?[.size] as? Int64 ?? 0

    sendEvent("onTransferComplete", [
      "downloadId": tid,
      "modelName": modelName,
      "destination": dest,
      "url": stored?.url ?? "",
      "bytesWritten": Double(size),
      "totalBytes": Double(size)
    ])
    removeMeta(tid)
  }

  func emitError(_ tid: String, error: Error) {
    let stored = getMeta(tid)
    let modelName = stored?.modelName ?? tid
    let nsErr = error as NSError
    let cancelled = nsErr.code == NSURLErrorCancelled

    if cancelled {
      sendEvent("onTransferCancelled", [
        "downloadId": tid,
        "modelName": modelName,
        "destination": stored?.destination ?? "",
        "url": stored?.url ?? "",
        "bytesWritten": 0.0,
        "totalBytes": 0.0
      ])
    } else {
      let underlying = (nsErr.userInfo[NSUnderlyingErrorKey] as? NSError) ?? nsErr
      let isEnospc = underlying.domain == NSPOSIXErrorDomain && underlying.code == Int(ENOSPC)
      let errorMsg = isEnospc ? "enospc" : error.localizedDescription
      sendEvent("onTransferError", [
        "downloadId": tid,
        "modelName": modelName,
        "destination": stored?.destination ?? "",
        "url": stored?.url ?? "",
        "error": errorMsg,
        "bytesWritten": 0.0,
        "totalBytes": 0.0
      ])
    }
    removeMeta(tid)
  }

  /* Reconnect to any background tasks that survived reload */
  private func reconnect() {
    session.getTasksWithCompletionHandler { [weak self] _, _, downloadTasks in
      guard let self else { return }
      for task in downloadTasks {
        guard let tid = task.taskDescription, task.state == .running || task.state == .suspended else { continue }
        if self.getMeta(tid) == nil {
          /*
            Metadata was cleared (e.g. UserDefaults eviction or reinstall).
            Without a destination path there is nowhere to put the file,
            so cancel the task rather than silently losing data later.
          */
          task.cancel()
          continue
        }
        if task.state == .suspended {
          task.resume()
        }
      }
    }
  }

  /* Persistent metadata store via UserDefaults */

  private func loadMeta() {
    metaLock.lock()
    defer { metaLock.unlock() }
    guard let data = UserDefaults.standard.data(forKey: Self.storeKey),
          let decoded = try? JSONDecoder().decode([String: TransferMeta].self, from: data)
    else { return }
    meta = decoded
  }

  private func saveMeta(_ snapshot: [String: TransferMeta]) {
    guard let data = try? JSONEncoder().encode(snapshot) else { return }
    UserDefaults.standard.set(data, forKey: Self.storeKey)
  }

  private func getMeta(_ tid: String) -> TransferMeta? {
    metaLock.lock()
    defer { metaLock.unlock() }
    return meta[tid]
  }

  private func setMeta(_ tid: String, _ entry: TransferMeta) {
    metaLock.lock()
    meta[tid] = entry
    let snapshot = meta
    metaLock.unlock()
    saveMeta(snapshot)
  }

  private func removeMeta(_ tid: String) {
    metaLock.lock()
    meta.removeValue(forKey: tid)
    let snapshot = meta
    metaLock.unlock()
    saveMeta(snapshot)
  }

  static func extractModelName(_ path: String?) -> String? {
    guard let p = path, !p.isEmpty else { return nil }
    let clean = p.hasPrefix("file://") ? String(p.dropFirst(7)) : p
    return clean.split(separator: "/").last.map(String.init)
  }

  private static func resolveDestinationURL(_ raw: String) -> URL {
    if let parsed = URL(string: raw), parsed.isFileURL {
      return parsed
    }
    if raw.hasPrefix("file://") {
      return URL(fileURLWithPath: String(raw.dropFirst(7)))
    }
    return URL(fileURLWithPath: raw)
  }
}

/* URLSession delegate that forwards events to the module */

private class SessionDelegate: NSObject, URLSessionDownloadDelegate {
  weak var module: TransferModule?

  func urlSession(_ session: URLSession, downloadTask: URLSessionDownloadTask,
                  didWriteData bytesWritten: Int64,
                  totalBytesWritten: Int64,
                  totalBytesExpectedToWrite: Int64) {
    guard let tid = downloadTask.taskDescription else { return }
    let pct = totalBytesExpectedToWrite > 0 ? Int(Double(totalBytesWritten) / Double(totalBytesExpectedToWrite) * 100) : 0
    os_log(.info, log: logger, "dl_tick tid=%@ pct=%d bytes=%lld/%lld", tid, pct, totalBytesWritten, totalBytesExpectedToWrite)
    module?.emitProgress(tid, bytesWritten: totalBytesWritten, totalBytes: totalBytesExpectedToWrite)
  }

  func urlSession(_ session: URLSession, downloadTask: URLSessionDownloadTask,
                  didFinishDownloadingTo location: URL) {
    guard let tid = downloadTask.taskDescription else { return }
    module?.emitComplete(tid, location: location)
  }

  func urlSession(_ session: URLSession, task: URLSessionTask,
                  didCompleteWithError error: Error?) {
    guard let tid = task.taskDescription, let error else { return }
    module?.emitError(tid, error: error)
  }

  func urlSession(_ session: URLSession,
                  didBecomeInvalidWithError error: Error?) {
    /* no-op; session should not be invalidated */
  }

  func urlSessionDidFinishEvents(forBackgroundURLSession session: URLSession) {
    DispatchQueue.main.async {
      NotificationCenter.default.post(
        name: Notification.Name("com.inferra.bgdownload.sessionFinished"),
        object: nil,
        userInfo: ["identifier": TransferModule.sessionId]
      )
    }
  }
}
